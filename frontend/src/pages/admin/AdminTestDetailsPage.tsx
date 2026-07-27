import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../services/api';
import { supabase } from '../../services/supabase';
import { 
  ArrowLeft, Layers, Plus, Trash2, Edit2, Play,
  ChevronRight, GripVertical, Wand2,
  Upload, Headphones, CheckCircle2, Loader2, Link2, Save, Image as ImageIcon, X, PenLine
} from 'lucide-react';
import PassageEditor from '../../components/admin/exam-builder/PassageEditor';
import QuestionBuilder, { QuestionData } from '../../components/admin/exam-builder/QuestionBuilder';
import BulkQuestionBuilder from '../../components/admin/exam-builder/BulkQuestionBuilder';
import StudentPreviewModal from '../../components/admin/exam-builder/StudentPreviewModal';
import { normalizeMatchingQuestionType } from '../../utils/matchingHeadings';
import { renderFormattedBlockText, renderFormattedText } from '../../utils/renderFormattedText';
import { resolveListeningAudioUrl } from '../../utils/audioUrl';

const MAX_UPLOAD_SIZE_MB = Number((import.meta as any).env.VITE_UPLOAD_MAX_SIZE_MB || 500);
const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;

export default function AdminTestDetailsPage() {
  const { id } = useParams();
  const [test, setTest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  
  // Selection states
  const [selectedSection, setSelectedSection] = useState<any>(null);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [editingQuestion, setEditingQuestion] = useState<QuestionData | null>(null);
  const [editingBatchKey, setEditingBatchKey] = useState<string | null>(null);
  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const [audioUploading, setAudioUploading] = useState(false);
  const [audioUrlInput, setAudioUrlInput] = useState('');
  const [imageUploading, setImageUploading] = useState(false);

  // Forms
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [sectionForm, setSectionForm] = useState({ id: '', title: '', type: 'reading', duration: '', order_no: 1 });

  const getDefaultGroupTitle = (sectionType: string, order: number) =>
    sectionType === 'listening'
      ? `Section ${order}`
      : sectionType === 'writing'
      ? `Writing Tasks ${order}`
      : `Questions Group ${order}`;

  const activeSection = selectedSection && test?.sections
    ? test.sections.find((sec: any) => sec.id === selectedSection.id) || selectedSection
    : selectedSection;
  const activeGroupFromSection = activeSection?.question_groups?.length
    ? activeSection.question_groups.find((grp: any) => grp.id === selectedGroup?.id) || activeSection.question_groups[0]
    : selectedGroup;
  const activeGroup = activeGroupFromSection && selectedGroup?.id === activeGroupFromSection.id
    ? { ...activeGroupFromSection, ...selectedGroup }
    : activeGroupFromSection;
  const writingGroup = activeSection?.type === 'writing'
    ? activeSection.question_groups?.[0] || activeGroup
    : null;
  const writingTasks = (writingGroup?.questions || [])
    .filter((question: any) => question.question_type === 'WRITING_TASK')
    .sort((a: any, b: any) => (Number(a.order_no) || 0) - (Number(b.order_no) || 0));
  const writingPracticeMode = activeSection?.type === 'writing' && /task\s*1/i.test(activeSection?.title || '')
    ? 'task_1'
    : activeSection?.type === 'writing' && /task\s*2/i.test(activeSection?.title || '')
    ? 'task_2'
    : 'full';
  const maxWritingTasks = writingPracticeMode === 'full' ? 2 : 1;
  const requiredWritingTaskNumber = writingPracticeMode === 'task_2' ? 2 : 1;
  const storedListeningAudioFile = test?.audio_file || test?.sections
    ?.filter((sec: any) => sec.type === 'listening')
    ?.flatMap((sec: any) => sec.question_groups || [])
    ?.find((grp: any) => grp.audio_url)
    ?.audio_url || '';
  const listeningAudioUrl = resolveListeningAudioUrl(storedListeningAudioFile);
  const [expandedBatchKey, setExpandedBatchKey] = useState<string | null>(null);
  
  const fetchTestDetails = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/tests/${id}`);
      
      // Map DB types back to UI 13-types
      if (data.sections) {
        data.sections.forEach((sec: any) => {
          sec.question_groups?.forEach((grp: any) => {
            grp.questions?.forEach((q: any) => {
              if (q.extra_data_json?.original_type) {
                q.question_type = q.extra_data_json.original_type;
              }
              normalizeMatchingQuestionType(q, grp.instruction || '');
            });
          });
        });
      }

      setTest(data);
      
      // Keep selection if possible, otherwise select first
      if (data.sections?.length > 0) {
        const secToSelect = selectedSection ? data.sections.find((s: any) => s.id === selectedSection.id) || data.sections[0] : data.sections[0];
        setSelectedSection(secToSelect);
        
        if (secToSelect.question_groups?.length > 0) {
          const grpToSelect = selectedGroup ? secToSelect.question_groups.find((g: any) => g.id === selectedGroup.id) || secToSelect.question_groups[0] : secToSelect.question_groups[0];
          setSelectedGroup(grpToSelect);
        } else {
          setSelectedGroup(null);
        }
      } else {
        setSelectedSection(null);
        setSelectedGroup(null);
      }
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch test details:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTestDetails();
  }, [id]);

  useEffect(() => {
    setAudioUrlInput(storedListeningAudioFile);
  }, [storedListeningAudioFile]);

  // Section Handlers
  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        mock_test_id: id,
        type: sectionForm.type.toLowerCase(),
        title: sectionForm.title,
        order_no: Number(sectionForm.order_no)
      };
      if (sectionForm.duration) {
        payload.duration = Number(sectionForm.duration);
      }

      if (sectionForm.id) {
        await api.put(`/admin/sections/${sectionForm.id}`, payload);
      } else {
        await api.post('/admin/sections', payload);
      }
      setIsSectionModalOpen(false);
      fetchTestDetails();
    } catch (err: any) {
      const details = Array.isArray(err.details)
        ? `\n${err.details.map((detail: any) => `${detail.field}: ${detail.message}`).join('\n')}`
        : '';
      alert(`${err.message || 'Failed to save section'}${details}`);
    }
  };

  const handleDeleteSection = async (secId: string) => {
    if (!confirm('Delete this section and everything inside it?')) return;
    try {
      await api.delete(`/admin/sections/${secId}`);
      if (selectedSection?.id === secId) setSelectedSection(null);
      fetchTestDetails();
    } catch (err) {
      alert('Failed to delete section');
    }
  };

  // Group Handlers (Auto-save approach)
  const createGroup = async () => {
    if (!activeSection) return;
    try {
      const order = (activeSection.question_groups?.length || 0) + 1;
      const { data: newGroup } = await api.post('/admin/groups', {
        section_id: activeSection.id,
        title: getDefaultGroupTitle(activeSection.type, order),
        instruction: '',
        passage: '',
        audio_url: '',
        order_no: order
      });
      setSelectedGroup(newGroup);
      await fetchTestDetails();
    } catch (err) {
      alert('Failed to create group');
    }
  };

  const patchGroupInLocalState = (groupId: string, updates: Record<string, any>) => {
    setSelectedGroup((current: any) =>
      current?.id === groupId ? { ...current, ...updates } : current
    );
    setTest((current: any) => {
      if (!current?.sections) return current;
      return {
        ...current,
        sections: current.sections.map((section: any) => ({
          ...section,
          question_groups: section.question_groups?.map((group: any) =>
            group.id === groupId ? { ...group, ...updates } : group
          ) || [],
        })),
      };
    });
    setSelectedSection((current: any) => {
      if (!current?.question_groups) return current;
      return {
        ...current,
        question_groups: current.question_groups.map((group: any) =>
          group.id === groupId ? { ...group, ...updates } : group
        ),
      };
    });
  };

  const handleUpdateGroupPassage = async (passage: string) => {
    if (!activeGroup) return;
    if (passage === activeGroup.passage || passage === selectedGroup?.passage) return;
    patchGroupInLocalState(activeGroup.id, { passage }); // optimistic UI
    try {
      await api.put(`/admin/groups/${activeGroup.id}`, {
        passage
      });
      // Silent save
    } catch (err) {
      console.error('Failed to save passage', err);
    }
  };

  const updateGroupMeta = async (field: string, value: string) => {
    if (!activeGroup) return;
    if (value === activeGroup[field]) return;
    patchGroupInLocalState(activeGroup.id, { [field]: value });
    try {
      await api.put(`/admin/groups/${activeGroup.id}`, {
        [field]: value
      });
    } catch (err) {
      console.error('Failed to update group', err);
    }
  };

  const saveListeningAudioUrl = async (audioUrl: string) => {
    if (!activeSection || activeSection.type !== 'listening') return;
    await api.put(`/admin/tests/${id}/audio`, { audio_file: audioUrl });
    await fetchTestDetails();
  };

  const handleUploadListeningAudio = async (file?: File | null) => {
    if (!file || !activeSection || activeSection.type !== 'listening') return;
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      alert(`This file is ${(file.size / 1024 / 1024).toFixed(1)}MB. Please upload an MP3 or M4A under ${MAX_UPLOAD_SIZE_MB}MB.`);
      return;
    }

    try {
      setAudioUploading(true);
      const { data: uploadSession } = await api.post(`/admin/tests/${id}/audio/sign`, {
        file_name: file.name,
        content_type: file.type || 'audio/mpeg',
      });

      const uploadPath = uploadSession.audio_file || uploadSession.path;
      const { error: uploadError } = await supabase.storage
        .from(uploadSession.bucket)
        .uploadToSignedUrl(uploadPath, uploadSession.token, file, {
          contentType: file.type || 'audio/mpeg',
        });

      if (uploadError) {
        throw new Error(uploadError.message || 'Failed to upload listening audio to storage.');
      }

      await api.put(`/admin/tests/${id}/audio`, {
        audio_file: uploadPath,
      });

      await fetchTestDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to upload listening audio');
    } finally {
      setAudioUploading(false);
    }
  };

  const uploadAssetFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await api.post('/admin/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return data;
  };

  const prepareImageForUpload = async (file: File) => {
    if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;

    try {
      const imageUrl = URL.createObjectURL(file);
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = imageUrl;
      });

      const maxDimension = 1800;
      const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
      if (scale >= 1 && file.size < 350 * 1024) {
        URL.revokeObjectURL(imageUrl);
        return file;
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      if (!context) {
        URL.revokeObjectURL(imageUrl);
        return file;
      }

      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(imageUrl);

      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.88));
      if (!blob || blob.size >= file.size) return file;

      const fileName = file.name.replace(/\.[^.]+$/, '') || 'task-visual';
      return new File([blob], `${fileName}.jpg`, { type: 'image/jpeg' });
    } catch {
      return file;
    }
  };

  const createInlineImageDataUrl = async (file: File) => {
    const imageUrl = URL.createObjectURL(file);
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = imageUrl;
      });

      const maxDimension = 1400;
      const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Could not prepare image preview.');

      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      return canvas.toDataURL('image/jpeg', 0.82);
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  };

  const handleUploadGroupImage = async (file?: File | null) => {
    if (!file || !activeGroup) return;
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      alert(`This file is ${(file.size / 1024 / 1024).toFixed(1)}MB. Please upload a file under ${MAX_UPLOAD_SIZE_MB}MB.`);
      return;
    }

    try {
      setImageUploading(true);
      const uploadFile = await prepareImageForUpload(file);
      let imageUrl = '';

      try {
        const data = await uploadAssetFile(uploadFile);
        imageUrl = data.url;
      } catch (uploadErr: any) {
        const message = `${uploadErr.response?.data?.message || uploadErr.message || ''}`;
        if (!/maximum allowed size|failed to fetch|network|storage/i.test(message)) {
          throw uploadErr;
        }
        imageUrl = await createInlineImageDataUrl(file);
      }

      await api.put(`/admin/groups/${activeGroup.id}`, { image_url: imageUrl });
      setSelectedGroup({ ...activeGroup, image_url: imageUrl });
      await fetchTestDetails();
    } catch (err: any) {
      const fileSize = `${(file.size / 1024).toFixed(0)}KB`;
      alert(`${err.response?.data?.message || err.message || 'Failed to upload group image'}\nSelected file size: ${fileSize}`);
    } finally {
      setImageUploading(false);
    }
  };

  const handleSaveGroupImageUrl = async () => {
    if (!activeGroup) return;
    const url = window.prompt('Paste image URL', activeGroup.image_url || '');
    if (url === null) return;

    const trimmedUrl = url.trim();
    if (trimmedUrl) {
      try {
        new URL(trimmedUrl);
      } catch {
        alert('Please paste a valid image URL.');
        return;
      }
    }

    try {
      setImageUploading(true);
      await api.put(`/admin/groups/${activeGroup.id}`, { image_url: trimmedUrl });
      setSelectedGroup({ ...activeGroup, image_url: trimmedUrl });
      await fetchTestDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to save image URL');
    } finally {
      setImageUploading(false);
    }
  };

  const handleRemoveGroupImage = async () => {
    if (!activeGroup) return;
    try {
      setImageUploading(true);
      await api.put(`/admin/groups/${activeGroup.id}`, { image_url: '' });
      setSelectedGroup({ ...activeGroup, image_url: '' });
      await fetchTestDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to remove group image');
    } finally {
      setImageUploading(false);
    }
  };

  const handleSaveListeningAudioUrl = async () => {
    const url = audioUrlInput.trim();

    if (!url) {
      alert('Paste the Supabase audio storage path first.');
      return;
    }

    try {
      setAudioUploading(true);
      await saveListeningAudioUrl(url);
    } catch (err: any) {
      alert(err.message || 'Failed to save audio URL');
    } finally {
      setAudioUploading(false);
    }
  };

  const handleDeleteGroup = async (grpId: string) => {
    if (!confirm('Delete this question group?')) return;
    try {
      await api.delete(`/admin/groups/${grpId}`);
      if (selectedGroup?.id === grpId) setSelectedGroup(null);
      fetchTestDetails();
    } catch (err) {
      alert('Failed to delete group');
    }
  };

  // Question Handlers
  const startCreateQuestion = () => {
    const questions = activeGroup?.questions || [];
    const nextQuestionNumber = questions.length > 0
      ? Math.max(...questions.map((q: any) => Number(q.question_number) || 0)) + 1
      : 1;

    setEditingBatchKey(null);
    setEditingQuestion({
      question_type: 'FILL_IN_THE_BLANK',
      question_number: nextQuestionNumber,
      question_text: '',
      correct_answers_json: [''],
      marks: 1,
      order_no: (activeGroup?.questions?.length || 0) + 1
    });
  };

  const ensureWritingGroup = async () => {
    if (!activeSection || activeSection.type !== 'writing') return null;
    if (writingGroup) {
      setSelectedGroup(writingGroup);
      return writingGroup;
    }

    const { data: newGroup } = await api.post('/admin/groups', {
      section_id: activeSection.id,
      title: 'Writing Tasks',
      instruction: '',
      passage: '',
      audio_url: '',
      order_no: 1
    });

    setSelectedGroup(newGroup);
    await fetchTestDetails();
    return newGroup;
  };

  const startCreateWritingTask = async () => {
    const group = await ensureWritingGroup();
    if (!group) return;

    const questions = group.questions || writingTasks;
    if (questions.length >= maxWritingTasks) {
      alert(writingPracticeMode === 'full' ? 'IELTS Writing has only Task 1 and Task 2.' : 'This practice test is for one writing task only.');
      return;
    }
    const nextQuestionNumber = questions.length > 0
      ? Math.max(...questions.map((q: any) => Number(q.question_number) || 0)) + 1
      : 1;
    const taskNumber = writingPracticeMode === 'full' ? questions.length + 1 : requiredWritingTaskNumber;
    const suggestedMinutes = writingPracticeMode === 'full'
      ? taskNumber === 1 ? 20 : 40
      : taskNumber === 1 ? 30 : 50;

    setEditingBatchKey(null);
    setEditingQuestion({
      question_type: 'WRITING_TASK',
      question_number: nextQuestionNumber,
      question_text: '',
      instruction: `You should spend about ${suggestedMinutes} minutes on this task.`,
      correct_answers_json: [],
      marks: 0,
      order_no: questions.length + 1,
      extra_data_json: {
        task_type: taskNumber === 1 ? 'Task 1' : 'Task 2',
        task_title: taskNumber === 1 ? 'Task 1' : 'Task 2',
        minimum_words: taskNumber === 1 ? 150 : 250,
        suggested_minutes: suggestedMinutes
      }
    } as any);
  };

  const mapToDBType = (type: string) => {
    if (type === 'WRITING_TASK') return 'WRITING_TASK';
    if (['FILL_IN_THE_BLANK', 'SUMMARY_COMPLETION', 'TABLE_COMPLETION', 'SHORT_ANSWER', 'DIAGRAM_LABELLING'].includes(type)) return 'INPUT_TEXT';
    if (['SUMMARY_COMPLETION_OPTIONS', 'MULTI_SELECT'].includes(type)) return 'MULTI_SELECT';
    if (['SINGLE_MCQ', 'SENTENCE_COMPLETION'].includes(type)) return 'SINGLE_MCQ';
    if (['MATCHING', 'MATCHING_INFORMATION', 'MATCHING_HEADINGS'].includes(type)) return 'MATCHING';
    return type; // TRUE_FALSE_NOT_GIVEN, YES_NO_NOT_GIVEN fall through
  };

  const handleSaveQuestion = async () => {
    const targetGroup = activeSection?.type === 'writing' ? writingGroup : activeGroup;
    if (!editingQuestion || !targetGroup) return;
    try {
      const dbType = mapToDBType(editingQuestion.question_type);
      const originalQuestion = getOriginalQuestionById(editingQuestion.id);
      const originalBatch = getOriginalQuestionBatch(editingQuestion.id);
      const preservedBulkBatchId = editingQuestion.id
        ? editingBatchKey || getStoredBulkBatchId(originalQuestion) || getStoredBulkBatchId(editingQuestion) || originalBatch?.key
        : null;
      const extraData = {
        ...(originalQuestion?.extra_data_json || {}),
        ...(editingQuestion.extra_data_json || {}),
        original_type: editingQuestion.question_type,
        ...(preservedBulkBatchId ? { bulk_batch_id: preservedBulkBatchId } : {})
      };
      const payload = {
        ...editingQuestion,
        group_id: targetGroup.id,
        question_type: dbType,
        correct_answers_json: editingQuestion.correct_answers_json || [],
        marks: dbType === 'WRITING_TASK' ? 0 : editingQuestion.marks,
        extra_data_json: extraData
      };

      if (editingQuestion.id) {
        await api.put(`/admin/questions/${editingQuestion.id}`, payload);
      } else {
        await api.post('/admin/questions', payload);
      }
      setEditingQuestion(null);
      setEditingBatchKey(null);
      if (preservedBulkBatchId) setExpandedBatchKey(preservedBulkBatchId);
      fetchTestDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to save question');
    }
  };

  const handleSaveBulkQuestions = async (questions: QuestionData[], instruction?: string) => {
    if (!activeGroup) return;
    try {
      const bulkBatchId = `bulk-${Date.now()}`;
      const bulkInstruction = instruction?.trim();

      // Loop through and save all questions
      for (const q of questions) {
        const dbType = mapToDBType(q.question_type);
        const payload = {
          ...q,
          instruction: bulkInstruction || q.instruction || '',
          group_id: activeGroup.id,
          question_type: dbType,
          extra_data_json: {
            ...(q.extra_data_json || {}),
            original_type: q.question_type,
            bulk_batch_id: bulkBatchId,
            ...(bulkInstruction ? { bulk_instruction: bulkInstruction } : {})
          }
        };
        await api.post('/admin/questions', payload);
      }
      setIsBulkEditing(false);
      fetchTestDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to save bulk questions');
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!confirm('Delete this question?')) return;
    try {
      await api.delete(`/admin/questions/${qId}`);
      fetchTestDetails();
    } catch (err) {
      alert('Failed to delete question');
    }
  };

  const groupedQuestionTypes = new Set([
    'TABLE_COMPLETION',
    'SUMMARY_COMPLETION',
    'SUMMARY_COMPLETION_OPTIONS',
    'TRUE_FALSE_NOT_GIVEN',
    'YES_NO_NOT_GIVEN',
    'MATCHING',
    'MATCHING_INFORMATION',
    'MATCHING_HEADINGS',
    'MULTI_SELECT',
  ]);

  const getSemanticBatchKey = (q: any) => {
    if (groupedQuestionTypes.has(q.question_type)) {
      const optionKey = JSON.stringify(q.options_json || []);
      return `inferred:${activeGroup?.id}:${q.question_type}:${q.instruction || activeGroup?.instruction || ''}:${optionKey}`;
    }

    return `single:${q.id || q.order_no}`;
  };

  const getStoredBulkBatchId = (q?: any) => q?.extra_data_json?.bulk_batch_id;

  const getBatchKey = (q: any) => {
    const bulkBatchId = getStoredBulkBatchId(q);
    if (bulkBatchId) {
      return bulkBatchId;
    }

    if (q.extra_data_json?.bulk_source) return `source:${q.question_type}:${q.extra_data_json.bulk_source}`;

    // Older questions, or questions edited before bulk metadata existed, can lose
    // the explicit batch marker. Keep IELTS group-style questions together anyway.
    return getSemanticBatchKey(q);
  };

  const getOriginalQuestionById = (questionId?: string) => {
    if (!questionId) return null;
    return activeGroup?.questions?.find((q: any) => q.id === questionId) || null;
  };

  const getOriginalQuestionBatch = (questionId?: string) => {
    const originalQuestion = getOriginalQuestionById(questionId);
    if (!originalQuestion) return null;

    const key = getBatchKey(originalQuestion);
    const questionsInBatch = (activeGroup?.questions || []).filter((q: any) => getBatchKey(q) === key);

    return questionsInBatch.length > 1 ? { key, questions: questionsInBatch } : null;
  };

  const questionBatches = (activeGroup?.questions || []).reduce((batches: any[], q: any) => {
    const key = getBatchKey(q);
    const existing = batches.find((batch) => batch.key === key);
    if (existing) {
      existing.questions.push(q);
    } else {
      batches.push({ key, questions: [q] });
    }
    return batches;
  }, []).map((batch: any) => ({
    ...batch,
    questions: [...batch.questions].sort((a: any, b: any) => (Number(a.order_no) || 0) - (Number(b.order_no) || 0)),
  }));

  const startEditQuestion = (q: any, batchKey?: string | null) => {
    setEditingBatchKey(batchKey || getBatchKey(q));
    setEditingQuestion(q);
  };

  const cancelEditQuestion = () => {
    setEditingQuestion(null);
    setEditingBatchKey(null);
  };

  const renderQuestionCard = (q: any, batchKey?: string | null) => (
    q.question_type === 'WRITING_TASK' ? (
      editingQuestion?.id === q.id && editingQuestion !== null ? (
        <WritingTaskBuilder
          key={q.id}
          question={editingQuestion as any}
          onChange={setEditingQuestion}
          onSave={handleSaveQuestion}
          onCancel={cancelEditQuestion}
        />
      ) : (
        <div key={q.id} className="bg-white border border-rose-100 rounded-2xl p-5 shadow-sm group hover:border-rose-200 transition-colors flex items-start gap-4">
          <div className="h-8 w-8 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center font-black text-[13px] shrink-0 border border-rose-100">
            {q.question_number}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-wider rounded-md">
                {q.extra_data_json?.task_type || 'Writing Task'}
              </span>
              <span className="text-[11px] text-slate-400 font-bold">
                {q.extra_data_json?.minimum_words || 250}+ words • {q.extra_data_json?.suggested_minutes || 40} min
              </span>
            </div>
            <div className="font-semibold text-[14px] text-[#05162E] leading-relaxed whitespace-pre-wrap">
              {renderFormattedBlockText(q.question_text, `admin-writing-question-${q.id}`)}
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => startEditQuestion(q, batchKey)}
              className="p-2 text-slate-400 hover:text-[#1E3A6E] bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDeleteQuestion(q.id)}
              className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      )
    ) : (
    editingQuestion?.id === q.id && editingQuestion !== null ? (
      <QuestionBuilder
        key={q.id}
        question={editingQuestion as any}
        onChange={setEditingQuestion}
        onSave={handleSaveQuestion}
        onCancel={cancelEditQuestion}
      />
    ) : (
      <div key={q.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm group hover:border-[#1E3A6E]/30 transition-colors flex items-start gap-4">
        <div className="h-8 w-8 bg-[#EFF4FB] text-[#1E3A6E] rounded-xl flex items-center justify-center font-black text-[13px] shrink-0 border border-[#1E3A6E]/10">
          {q.question_number}
        </div>

        <div className="flex-1 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider rounded-md">
              {q.question_type.replace(/_/g, ' ')}
            </span>
            {q.instruction && <span className="text-[11px] text-slate-400 italic font-medium">{q.instruction}</span>}
          </div>

          <div className="font-semibold text-[14px] text-[#05162E] leading-snug whitespace-pre-wrap">
            {q.question_text.includes('[blank]') ? (
              q.question_text.split('[blank]').map((part: string, i: number, arr: any[]) => (
                <React.Fragment key={i}>
                  {renderFormattedText(part, `admin-question-${q.id}-part-${i}`)}
                  {i !== arr.length - 1 && <span className="inline-block w-16 border-b-2 border-slate-300 mx-1"></span>}
                </React.Fragment>
              ))
            ) : (
              renderFormattedBlockText(q.question_text, `admin-question-${q.id}`)
            )}
          </div>

          <div className="flex flex-wrap gap-2 mt-1">
            {q.correct_answers_json?.map((ans: string, i: number) => (
              <span key={i} className="px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-600 text-[11px] font-bold rounded">
                ✓ {ans}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => startEditQuestion(q, batchKey)}
            className="p-2 text-slate-400 hover:text-[#1E3A6E] bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDeleteQuestion(q.id)}
            className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
    )
  );

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC] font-sans" style={{ fontFamily: "'Inter', sans-serif" }}>
      
      {/* Top Navigation Bar */}
      <header className="h-[70px] bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-6">
          <Link to="/admin/tests" className="flex items-center justify-center h-10 w-10 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-[#05162E]">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="h-6 w-px bg-slate-200"></div>
          <div>
            <h1 className="font-black text-[18px] text-[#05162E]">{test?.title || 'Loading...'}</h1>
            <p className="text-[12px] font-medium text-slate-500 uppercase tracking-widest flex items-center gap-2 mt-0.5">
              Visual Exam Builder
              <span className="h-1 w-1 rounded-full bg-slate-300"></span>
              {test?.is_published ? (
                <span className="text-emerald-500">Published</span>
              ) : (
                <span className="text-slate-400">Draft</span>
              )}
            </p>
          </div>
        </div>

        <button 
          onClick={() => setPreviewOpen(true)}
          className="px-5 py-2.5 bg-[#1E3A6E] hover:bg-[#162d57] text-white text-[13px] font-bold rounded-xl flex items-center gap-2 transition-all shadow-sm shadow-[#1E3A6E]/20"
        >
          <Play className="h-4 w-4" /> Preview as Student
        </button>
      </header>

      {loading ? (
        <div className="flex-1 flex justify-center items-center">
          <div className="w-12 h-12 border-4 border-slate-100 border-t-[#1E3A6E] rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          
          {/* SIDEBAR: Sections list */}
          <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur z-10">
              <h3 className="font-extrabold text-[12px] text-[#05162E] uppercase tracking-wider">Exam Sections</h3>
              <button 
                onClick={() => { setSectionForm({ id: '', title: '', type: 'listening', duration: '', order_no: (test?.sections?.length || 0) + 1 }); setIsSectionModalOpen(true); }}
                className="p-1.5 bg-[#F8FAFC] hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
                title="Add Section"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3 flex flex-col gap-2">
              {test?.sections?.map((sec: any) => (
                <div 
                  key={sec.id}
                  onClick={() => { setSelectedSection(sec); setSelectedGroup(sec.question_groups?.[0] || null); cancelEditQuestion(); setIsBulkEditing(false); setExpandedBatchKey(null); }}
                  className={`p-3 rounded-xl border-2 transition-all cursor-pointer group flex flex-col gap-2 ${
                    activeSection?.id === sec.id
                      ? 'border-[#1E3A6E] bg-[#EFF4FB]'
                      : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md mb-1.5 inline-block ${
                        sec.type === 'reading'
                          ? 'bg-amber-100 text-amber-700'
                          : sec.type === 'writing'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {sec.type}
                      </span>
                      <h4 className="font-bold text-[14px] text-[#05162E] leading-tight">{sec.title}</h4>
                    </div>
                    
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSectionForm({ ...sec, duration: sec.duration || '' }); setIsSectionModalOpen(true); }}
                        className="p-1 text-slate-400 hover:text-[#1E3A6E] transition-colors"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteSection(sec.id); }}
                        className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="text-[11px] font-semibold text-slate-500">
                    {sec.question_groups?.length || 0} Groups • {sec.question_groups?.reduce((acc: number, g: any) => acc + (g.questions?.length || 0), 0) || 0} Questions
                  </div>
                </div>
              ))}
              
              {(!test?.sections || test.sections.length === 0) && (
                <div className="text-center p-6 text-slate-400">
                  <p className="text-[12px] font-medium">No sections added.</p>
                </div>
              )}
            </div>
          </aside>

          {/* MAIN CANVAS */}
          <main className="flex-1 flex flex-col bg-[#F8FAFC] overflow-y-auto relative">
            {!activeSection ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                <Layers className="h-16 w-16 mb-4 text-slate-200" />
                <h3 className="font-bold text-[18px] text-[#05162E]">Select or Create a Section</h3>
                <p className="text-[14px] mt-2">Exam content is managed within sections (e.g., Reading Passage 1).</p>
              </div>
            ) : (
              <div className="max-w-5xl mx-auto w-full p-6 md:p-8 flex flex-col gap-8">
                
                {/* Passage Editor Widget (For Reading) */}
                {activeSection.type === 'reading' && (
                  <div className="flex flex-col gap-3">
                    <PassageEditor 
                      passage={activeGroup?.passage || ''} 
                      onChange={handleUpdateGroupPassage}
                    />
                  </div>
                )}

                {activeSection.type === 'listening' && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-blue-50 border border-blue-100 text-[#1E3A6E] flex items-center justify-center shrink-0">
                          <Headphones className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Listening Audio</p>
                          <h3 className="text-[17px] font-black text-[#05162E] mt-1">One locked track for the full Listening test</h3>
                          <p className="text-[12px] font-semibold text-slate-500 mt-1 leading-relaxed">
                            Upload the complete audio once. Parts, groups, and questions below reuse the Reading question engine.
                          </p>
                        </div>
                      </div>

                      <label className={`px-4 py-2.5 rounded-xl text-[12px] font-black flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
                        audioUploading
                          ? 'bg-slate-100 text-slate-400 pointer-events-none'
                          : 'bg-[#1E3A6E] hover:bg-[#162d57] text-white shadow-sm shadow-[#1E3A6E]/20'
                      }`}>
                        {audioUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        {listeningAudioUrl ? 'Replace Audio' : 'Upload Audio'}
                        <input
                          type="file"
                          accept="audio/mpeg,audio/mp3,audio/mp4,audio/aac,audio/wav,audio/x-wav,audio/x-m4a,.mp3,.m4a,.aac,.wav"
                          className="hidden"
                          disabled={audioUploading}
                          onChange={(event) => {
                            handleUploadListeningAudio(event.target.files?.[0]);
                            event.currentTarget.value = '';
                          }}
                        />
                      </label>
                    </div>

                    <div className="grid gap-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Link2 className="h-3.5 w-3.5" /> Audio Storage Path
                      </label>
                      <div className="flex flex-col md:flex-row gap-2">
                        <input
                          type="text"
                          value={audioUrlInput}
                          onChange={(event) => setAudioUrlInput(event.target.value)}
                          placeholder="audio/test-id/listening-track.mp3"
                          className="flex-1 min-w-0 px-3 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-[13px] font-semibold outline-none focus:border-[#1E3A6E]"
                        />
                        <button
                          type="button"
                          onClick={handleSaveListeningAudioUrl}
                          disabled={audioUploading || !audioUrlInput.trim() || audioUrlInput.trim() === storedListeningAudioFile}
                          className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-[#05162E] rounded-xl text-[12px] font-black flex items-center justify-center gap-2 shrink-0"
                        >
                          <Save className="h-4 w-4" /> Save URL
                        </button>
                      </div>
                      <p className="text-[11px] font-semibold text-slate-400">
                        For non-technical admins, use Upload Audio. This field stores only the relative Supabase/CDN path in the database.
                      </p>
                    </div>

                    {listeningAudioUrl ? (
                      <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[12px] font-black text-emerald-700">Audio ready for student preview</p>
                          <p className="text-[11px] font-semibold text-emerald-700/70 truncate">{storedListeningAudioFile}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl text-[12px] font-bold text-amber-800">
                        Upload audio before previewing the listening test experience.
                      </div>
                    )}
                  </div>
                )}

                {activeSection.type === 'writing' && (
                  <div className="flex flex-col gap-6">
                    <div className="bg-white border border-rose-100 rounded-2xl p-6 shadow-sm flex items-start gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                        <PenLine className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Writing Module</p>
                        <h3 className="text-[17px] font-black text-[#05162E] mt-1">
                          {writingPracticeMode === 'full'
                            ? 'Create exactly Task 1 and Task 2'
                            : `Create Writing Task ${requiredWritingTaskNumber} only`}
                        </h3>
                        <p className="text-[12px] font-semibold text-slate-500 mt-1 leading-relaxed">
                          {writingPracticeMode === 'full'
                            ? 'Task 1 can include an optional image, graph, table, or map. Writing responses are saved for manual marking.'
                            : `This practice test lets students attempt only Writing Task ${requiredWritingTaskNumber}. Responses are saved for manual marking.`}
                        </p>
                      </div>
                      <div className="px-3 py-2 bg-rose-50 border border-rose-100 rounded-xl text-[12px] font-black text-rose-600">
                        {writingTasks.length}/{maxWritingTasks} tasks
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-5">
                      {writingTasks.map((task: any) => (
                        <WritingTaskBuilder
                          key={task.id}
                          question={editingQuestion?.id === task.id ? editingQuestion : task}
                          onChange={setEditingQuestion}
                          onSave={handleSaveQuestion}
                          onCancel={cancelEditQuestion}
                          imageUrl={task.extra_data_json?.task_type === 'Task 1' ? writingGroup?.image_url : ''}
                          imageUploading={imageUploading}
                          onUploadImage={task.extra_data_json?.task_type === 'Task 1' ? handleUploadGroupImage : undefined}
                          onRemoveImage={task.extra_data_json?.task_type === 'Task 1' ? handleRemoveGroupImage : undefined}
                          startEditing={() => startEditQuestion(task)}
                          isEditing={editingQuestion?.id === task.id}
                          lockedTaskType={writingPracticeMode === 'full' ? undefined : `Task ${requiredWritingTaskNumber}`}
                        />
                      ))}

                      {editingQuestion && !editingQuestion.id && editingQuestion.question_type === 'WRITING_TASK' && (
                        <WritingTaskBuilder
                          question={editingQuestion as any}
                          onChange={setEditingQuestion}
                          onSave={handleSaveQuestion}
                          onCancel={cancelEditQuestion}
                          imageUrl={editingQuestion.extra_data_json?.task_type === 'Task 1' ? writingGroup?.image_url : ''}
                          imageUploading={imageUploading}
                          onUploadImage={editingQuestion.extra_data_json?.task_type === 'Task 1' ? handleUploadGroupImage : undefined}
                          onRemoveImage={editingQuestion.extra_data_json?.task_type === 'Task 1' ? handleRemoveGroupImage : undefined}
                          isEditing
                          lockedTaskType={writingPracticeMode === 'full' ? undefined : `Task ${requiredWritingTaskNumber}`}
                        />
                      )}
                    </div>

                    {!editingQuestion && writingTasks.length < maxWritingTasks && (
                      <button
                        onClick={startCreateWritingTask}
                        className="py-4 bg-transparent border-2 border-dashed border-rose-200 hover:border-rose-400 hover:bg-rose-50/40 text-rose-600 rounded-2xl font-bold text-[13px] flex items-center justify-center gap-2 transition-all"
                      >
                        <Plus className="h-4 w-4" /> Create {writingPracticeMode === 'full' ? (writingTasks.length === 0 ? 'Task 1' : 'Task 2') : `Task ${requiredWritingTaskNumber}`}
                      </button>
                    )}

                    <div className="grid md:grid-cols-3 gap-3">
                      {['AI Writing Evaluation', 'Band Score Prediction', 'Grammar Feedback', 'Vocabulary Analysis', 'Coherence & Cohesion Analysis', 'Examiner Comments'].map((feature) => (
                        <div key={feature} className="px-4 py-3 bg-white border border-slate-100 rounded-xl text-[12px] font-bold text-slate-400">
                          {feature}
                          <span className="block text-[10px] font-black uppercase tracking-widest text-slate-300 mt-1">Future</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Group Tabs Bar */}
                {activeSection.type !== 'writing' && <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <h3 className="font-extrabold text-[14px] text-[#05162E] uppercase tracking-wider flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-slate-400" /> {activeSection.type === 'reading' ? 'Question Type Practice Sets' : 'Question Groups'}
                    </h3>
                    <button 
                      onClick={createGroup}
                      className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-[12px] font-bold text-[#05162E] rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                    >
                      <Plus className="h-3.5 w-3.5" /> {activeSection.type === 'reading' ? 'New Practice Set' : 'New Group'}
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {activeSection.question_groups?.map((grp: any) => (
                      <div key={grp.id} className="relative group">
                        <button
                          onClick={() => { setSelectedGroup(grp); cancelEditQuestion(); setIsBulkEditing(false); setExpandedBatchKey(null); }}
                          className={`px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all border-2 ${
                            activeGroup?.id === grp.id
                              ? 'bg-white border-[#1E3A6E] text-[#1E3A6E] shadow-sm'
                              : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                          }`}
                        >
                          {grp.title || 'Untitled Group'}
                        </button>
                        {activeGroup?.id === grp.id && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteGroup(grp.id); }}
                            className="absolute -top-2 -right-2 h-6 w-6 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-full border border-red-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>}

                {/* Active Group Settings & Questions */}
                {activeSection.type !== 'writing' && activeGroup && (
                  <div className="flex flex-col gap-6">
                    {/* Inline Group Settings */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{activeSection.type === 'reading' ? 'Practice Set / Question Type Name' : 'Group Tab Name'}</label>
                          <input 
                            type="text" value={activeGroup.title} onChange={(e) => updateGroupMeta('title', e.target.value)}
                            placeholder={activeSection.type === 'reading' ? 'e.g. Matching Headings' : 'e.g. Section 1'}
                            className="px-3 py-2 bg-[#F8FAFC] border border-slate-200 rounded-xl text-[13px] font-semibold outline-none focus:border-[#1E3A6E]"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Student Instruction (Visible)</label>
                          <input 
                            type="text" value={activeGroup.instruction || ''} onChange={(e) => updateGroupMeta('instruction', e.target.value)}
                            placeholder="e.g. Choose NO MORE THAN TWO WORDS..."
                            className="px-3 py-2 bg-[#F8FAFC] border border-slate-200 rounded-xl text-[13px] font-semibold outline-none focus:border-[#1E3A6E]"
                          />
                        </div>
                      </div>

                      <div className="border-t border-slate-100 pt-4 flex flex-col gap-3">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                              <ImageIcon className="h-5 w-5" />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Group Image / Diagram</label>
                              <p className="text-[12px] font-semibold text-slate-500">Optional visual shown above this group's questions.</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <label className={`px-3 py-2 rounded-xl text-[12px] font-black flex items-center gap-2 transition-colors cursor-pointer ${
                              imageUploading
                                ? 'bg-slate-100 text-slate-400 pointer-events-none'
                                : 'bg-[#1E3A6E] hover:bg-[#162d57] text-white'
                            }`}>
                              {imageUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                              {activeGroup.image_url ? 'Replace' : 'Upload'}
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/gif,image/webp,.png,.jpg,.jpeg,.gif,.webp"
                                className="hidden"
                                disabled={imageUploading}
                                onChange={(event) => {
                                  handleUploadGroupImage(event.target.files?.[0]);
                                  event.currentTarget.value = '';
                                }}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={handleSaveGroupImageUrl}
                              disabled={imageUploading}
                              className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-[#05162E] rounded-xl text-[12px] font-black flex items-center gap-2"
                            >
                              <Link2 className="h-4 w-4" /> URL
                            </button>
                            {activeGroup.image_url && (
                              <button
                                type="button"
                                onClick={handleRemoveGroupImage}
                                disabled={imageUploading}
                                className="px-3 py-2 bg-red-50 border border-red-100 hover:bg-red-100 disabled:opacity-50 text-red-600 rounded-xl text-[12px] font-black flex items-center gap-2"
                              >
                                <X className="h-4 w-4" /> Remove
                              </button>
                            )}
                          </div>
                        </div>

                        {activeGroup.image_url && (
                          <div className="flex flex-col gap-2">
                            <img
                              src={activeGroup.image_url}
                              alt="Group visual preview"
                              className="w-full max-h-72 object-contain bg-[#F8FAFC] border border-slate-200 rounded-xl"
                            />
                            <p className="text-[11px] font-semibold text-slate-400 truncate">{activeGroup.image_url}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Question Builder List */}
                    <div className="flex flex-col gap-4">
                      {questionBatches.map((batch: any) => {
                        if (batch.questions.length === 1) {
                          return renderQuestionCard(batch.questions[0], batch.key);
                        }

                        const isExpanded = expandedBatchKey === batch.key;
                        const firstQuestion = batch.questions[0];
                        const lastQuestion = batch.questions[batch.questions.length - 1];
                        const typeNames = Array.from(new Set(batch.questions.map((q: any) => q.question_type.replace(/_/g, ' '))));
                        const missingAnswers = batch.questions.filter((q: any) => q.correct_answers_json?.includes('[NO ANSWER DETECTED]')).length;

                        return (
                          <div key={batch.key} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                            <button
                              type="button"
                              onClick={() => setExpandedBatchKey(isExpanded ? null : batch.key)}
                              className="w-full p-5 flex items-center gap-4 text-left hover:bg-[#F8FAFC] transition-colors"
                            >
                              <div className="h-10 w-10 bg-[#EFF4FB] text-[#1E3A6E] rounded-xl flex items-center justify-center shrink-0 border border-[#1E3A6E]/10">
                                <ChevronRight className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                  <span className="px-2 py-0.5 bg-[#1E3A6E] text-white text-[10px] font-black uppercase tracking-wider rounded-md">
                                    Bulk Set
                                  </span>
                                  {typeNames.map((typeName) => (
                                    <span key={String(typeName)} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider rounded-md">
                                      {String(typeName)}
                                    </span>
                                  ))}
                                  {missingAnswers > 0 && (
                                    <span className="px-2 py-0.5 bg-amber-50 border border-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-wider rounded-md">
                                      {missingAnswers} missing answers
                                    </span>
                                  )}
                                </div>
                                <h4 className="font-black text-[15px] text-[#05162E]">
                                  Questions {firstQuestion.question_number}-{lastQuestion.question_number}
                                </h4>
                                <p className="text-[12px] text-slate-500 font-semibold mt-0.5">
                                  {batch.questions.length} questions saved together. Click to review and edit individual questions.
                                </p>
                              </div>
                              <span className="px-3 py-2 bg-white border border-slate-200 text-[#1E3A6E] rounded-xl text-[12px] font-bold shadow-sm">
                                {isExpanded ? 'Hide' : 'Manage'}
                              </span>
                            </button>

                            {isExpanded && (
                              <div className="p-4 bg-[#F8FAFC] border-t border-slate-200 flex flex-col gap-3">
                                {batch.questions.map((q: any) => renderQuestionCard(q, batch.key))}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Add Question Button OR New Question Builder */}
                      {isBulkEditing ? (
                        <BulkQuestionBuilder
                          onSave={handleSaveBulkQuestions}
                          onCancel={() => setIsBulkEditing(false)}
                          nextOrderNo={(activeGroup.questions?.length || 0) + 1}
                          currentInstruction={activeGroup.instruction || ''}
                        />
                      ) : editingQuestion && !editingQuestion.id && editingQuestion.question_type === 'WRITING_TASK' ? (
                        <WritingTaskBuilder
                          question={editingQuestion as any}
                          onChange={setEditingQuestion}
                          onSave={handleSaveQuestion}
                          onCancel={cancelEditQuestion}
                        />
                      ) : editingQuestion && !editingQuestion.id ? (
                        <QuestionBuilder 
                          question={editingQuestion}
                          onChange={setEditingQuestion}
                          onSave={handleSaveQuestion}
                          onCancel={cancelEditQuestion}
                        />
                      ) : activeSection.type === 'writing' ? (
                        <div className="flex gap-4">
                          <button
                            onClick={startCreateWritingTask}
                            className="flex-1 py-4 bg-transparent border-2 border-dashed border-rose-200 hover:border-rose-400 hover:bg-rose-50/40 text-rose-600 rounded-2xl font-bold text-[13px] flex items-center justify-center gap-2 transition-all"
                          >
                            <Plus className="h-4 w-4" /> Add Writing Task
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-4">
                          <button
                            onClick={startCreateQuestion}
                            className="flex-1 py-4 bg-transparent border-2 border-dashed border-slate-300 hover:border-[#1E3A6E]/50 hover:bg-[#F8FAFC] text-slate-500 hover:text-[#1E3A6E] rounded-2xl font-bold text-[13px] flex items-center justify-center gap-2 transition-all"
                          >
                            <Plus className="h-4 w-4" /> Add Single Question
                          </button>
                          <button
                            onClick={() => setIsBulkEditing(true)}
                            className="flex-1 py-4 bg-[#F8FAFC] border-2 border-dashed border-[#1E3A6E]/30 hover:border-[#1E3A6E] hover:bg-white text-[#1E3A6E] rounded-2xl font-bold text-[13px] flex items-center justify-center gap-2 transition-all"
                          >
                            <Wand2 className="h-4 w-4" /> Bulk Add Questions
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </main>

        </div>
      )}

      {/* Preview Modal */}
      {previewOpen && (
        <StudentPreviewModal test={test} onClose={() => setPreviewOpen(false)} />
      )}

      {/* Section Create/Edit Modal */}
      <AnimatePresence>
        {isSectionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#05162E]/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 p-6 flex flex-col gap-4"
            >
              <h3 className="font-black text-[18px] text-[#05162E]">{sectionForm.id ? 'Edit Section' : 'Add Section'}</h3>
              <form onSubmit={handleSaveSection} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Title</label>
                  <input required type="text" value={sectionForm.title} onChange={e => setSectionForm({...sectionForm, title: e.target.value})} className="px-3 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl outline-none focus:border-[#1E3A6E] text-[14px] font-medium" placeholder="e.g. Reading Passage 1" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Type</label>
                  <select value={sectionForm.type} onChange={e => setSectionForm({...sectionForm, type: e.target.value})} className="px-3 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl outline-none focus:border-[#1E3A6E] text-[14px] font-medium">
                    <option value="listening">Listening</option>
                    <option value="reading">Reading</option>
                    <option value="writing">Writing</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 mt-2">
                  <button type="button" onClick={() => setIsSectionModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold text-[13px] hover:bg-slate-100 rounded-lg">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-[#1E3A6E] text-white font-bold text-[13px] rounded-lg">Save Section</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

const WritingTaskBuilder = ({
  question,
  onChange,
  onSave,
  onCancel,
  imageUrl = '',
  imageUploading = false,
  onUploadImage,
  onRemoveImage,
  startEditing,
  isEditing = !question.id,
  lockedTaskType,
}: {
  question: any;
  onChange: (question: any) => void;
  onSave: () => void;
  onCancel: () => void;
  imageUrl?: string;
  imageUploading?: boolean;
  onUploadImage?: (file?: File | null) => void;
  onRemoveImage?: () => void;
  startEditing?: () => void;
  isEditing?: boolean;
  lockedTaskType?: string;
}) => {
  const meta = question.extra_data_json || {};
  const taskType = lockedTaskType || meta.task_type || 'Task 1';

  const updateMeta = (updates: Record<string, any>) => {
    onChange({
      ...question,
      extra_data_json: {
        ...meta,
        ...updates,
        original_type: 'WRITING_TASK',
      },
    });
  };

  if (!isEditing) {
    return (
      <div className="bg-white border border-rose-100 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{taskType}</p>
            <h3 className="font-black text-[17px] text-[#05162E] mt-1">{meta.task_title || taskType}</h3>
            <p className="text-[11px] text-slate-400 font-bold mt-1">
              {meta.suggested_minutes || (taskType === 'Task 1' ? 20 : 40)} min • {meta.minimum_words || (taskType === 'Task 1' ? 150 : 250)}+ words
            </p>
          </div>
          <button
            type="button"
            onClick={startEditing}
            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-[12px] font-black flex items-center gap-2"
          >
            <Edit2 className="h-4 w-4" /> Edit
          </button>
        </div>
        {taskType === 'Task 1' && imageUrl && (
          <img src={imageUrl} alt="Task 1 visual" className="w-full max-h-56 object-contain bg-[#F8FAFC] border border-slate-200 rounded-xl" />
        )}
        <div className="p-4 bg-[#F8FAFC] border border-slate-100 rounded-xl">
          {question.instruction && <p className="text-[12px] font-bold text-slate-500 mb-3">{question.instruction}</p>}
          <div className="text-[13px] font-semibold text-[#05162E] leading-relaxed whitespace-pre-wrap line-clamp-6">
            {renderFormattedBlockText(question.question_text, `writing-summary-${question.id}`)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-rose-100 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{taskType}</p>
          <h3 className="font-black text-[17px] text-[#05162E] mt-1">
            {question.id ? 'Edit writing task' : `Create ${taskType}`}
          </h3>
        </div>
        <PenLine className="h-5 w-5 text-rose-500" />
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Task Label</label>
          <select
            value={taskType}
            onChange={(event) => updateMeta({ task_type: event.target.value })}
            disabled={Boolean(lockedTaskType)}
            className="px-3 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-[13px] font-semibold outline-none focus:border-rose-400"
          >
            <option value="Task 1">Task 1</option>
            <option value="Task 2">Task 2</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Task Title</label>
          <input
            type="text"
            value={meta.task_title || taskType}
            onChange={(event) => updateMeta({ task_title: event.target.value })}
            className="px-3 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-[13px] font-semibold outline-none focus:border-rose-400"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Minimum Words</label>
          <input
            type="number"
            min={1}
            value={meta.minimum_words || 250}
            onChange={(event) => updateMeta({ minimum_words: Number(event.target.value) })}
            className="px-3 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-[13px] font-semibold outline-none focus:border-rose-400"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Suggested Minutes</label>
          <input
            type="number"
            min={1}
            value={meta.suggested_minutes || 40}
            onChange={(event) => updateMeta({ suggested_minutes: Number(event.target.value) })}
            className="px-3 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-[13px] font-semibold outline-none focus:border-rose-400"
          />
        </div>
      </div>

      {taskType === 'Task 1' && onUploadImage && (
        <div className="flex flex-col gap-3 border border-slate-100 rounded-2xl p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Image / Graph / Table / Map</label>
              <p className="text-[12px] text-slate-500 font-semibold mt-1">Optional visual for Task 1.</p>
            </div>
            <div className="flex gap-2">
              <label className={`px-3 py-2 rounded-xl text-[12px] font-black flex items-center gap-2 transition-colors cursor-pointer ${
                imageUploading ? 'bg-slate-100 text-slate-400 pointer-events-none' : 'bg-rose-600 hover:bg-rose-700 text-white'
              }`}>
                {imageUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {imageUrl ? 'Replace Image' : 'Upload Image'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp,.png,.jpg,.jpeg,.gif,.webp"
                  className="hidden"
                  disabled={imageUploading}
                  onChange={(event) => {
                    onUploadImage(event.target.files?.[0]);
                    event.currentTarget.value = '';
                  }}
                />
              </label>
              {imageUrl && onRemoveImage && (
                <button
                  type="button"
                  onClick={onRemoveImage}
                  disabled={imageUploading}
                  className="px-3 py-2 bg-red-50 border border-red-100 hover:bg-red-100 disabled:opacity-50 text-red-600 rounded-xl text-[12px] font-black"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
          {imageUrl && (
            <img src={imageUrl} alt="Task 1 visual preview" className="w-full max-h-64 object-contain bg-[#F8FAFC] border border-slate-200 rounded-xl" />
          )}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Instructions</label>
        <textarea
          value={question.instruction || ''}
          onChange={(event) => onChange({ ...question, instruction: event.target.value })}
          rows={3}
          placeholder="e.g. You should spend about 20 minutes on this task."
          className="w-full px-4 py-3 bg-[#F8FAFC] border border-slate-200 focus:border-rose-400 rounded-xl text-[13px] text-[#05162E] placeholder-slate-400 outline-none transition-all resize-y"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{taskType === 'Task 1' ? 'Question Prompt' : 'Essay Prompt'}</label>
        <textarea
          required
          value={question.question_text || ''}
          onChange={(event) => onChange({
            ...question,
            question_text: event.target.value,
            question_type: 'WRITING_TASK',
            correct_answers_json: [],
            marks: 0,
          })}
          rows={8}
          placeholder="Paste the full IELTS writing task prompt here..."
          className="w-full px-4 py-3.5 bg-[#F8FAFC] border border-slate-200 focus:border-rose-400 focus:ring-4 focus:ring-rose-100 rounded-xl text-[14px] text-[#05162E] placeholder-slate-400 outline-none transition-all resize-y"
        />
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[13px] font-bold rounded-xl"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!question.question_text?.trim()}
          className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[13px] font-bold rounded-xl"
        >
          Save Writing Task
        </button>
      </div>
    </div>
  );
};
