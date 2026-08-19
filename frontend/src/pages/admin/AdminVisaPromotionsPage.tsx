import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Edit3, ExternalLink, Image as ImageIcon, Loader2, Megaphone, Plus, Save, Trash2, UploadCloud, X } from 'lucide-react';
import JawaafLogo from '../../components/JawaafLogo';
import { api } from '../../services/api';
import { supabase } from '../../services/supabase';

type VisaPromotion = {
  id: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  cta_label?: string | null;
  cta_url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
};

const emptyPromotion = {
  title: '',
  description: '',
  image_url: '',
  cta_label: 'Learn More',
  cta_url: '',
  is_active: true
};

const MAX_IMAGE_SIZE_MB = 8;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

const getErrorMessage = (err: any, fallback: string) =>
  err?.response?.data?.message || err?.message || err?.details || fallback;

export default function AdminVisaPromotionsPage() {
  const [promotions, setPromotions] = useState<VisaPromotion[]>([]);
  const [promotionForm, setPromotionForm] = useState<any>(emptyPromotion);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadPromotions = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/admin/visa-promotions');
      setPromotions(Array.isArray(data) ? data : []);
    } catch (err: any) {
      alert(getErrorMessage(err, 'Failed to load visa promotions.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPromotions();
  }, []);

  const startCreate = () => {
    setPromotionForm({ ...emptyPromotion });
    setShowForm(true);
  };

  const editPromotion = (promotion: VisaPromotion) => {
    setPromotionForm({
      id: promotion.id,
      title: promotion.title || '',
      description: promotion.description || '',
      image_url: promotion.image_url || '',
      cta_label: promotion.cta_label || 'Learn More',
      cta_url: promotion.cta_url || '',
      is_active: Boolean(promotion.is_active)
    });
    setShowForm(true);
  };

  const uploadPromotionImage = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please upload a PNG, JPG, GIF, or WebP image.');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      alert(`Please upload an image under ${MAX_IMAGE_SIZE_MB}MB.`);
      return;
    }

    try {
      setUploading(true);
      const { data: uploadSession } = await api.post('/admin/assets/sign', {
        file_name: file.name,
        content_type: file.type || 'image/jpeg',
        folder: 'visa-promotions'
      });

      const { error: uploadError } = await supabase.storage
        .from(uploadSession.bucket)
        .uploadToSignedUrl(uploadSession.path, uploadSession.token, file, {
          contentType: file.type || 'image/jpeg'
        });

      if (uploadError) throw uploadError;
      setPromotionForm((current: any) => ({ ...current, image_url: uploadSession.url }));
    } catch (err: any) {
      alert(getErrorMessage(err, 'Failed to upload promotion image.'));
    } finally {
      setUploading(false);
    }
  };

  const savePromotion = async () => {
    if (!promotionForm.title.trim()) {
      alert('Promotion title is required.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title: promotionForm.title.trim(),
        description: promotionForm.description.trim(),
        image_url: promotionForm.image_url.trim(),
        cta_label: promotionForm.cta_label.trim(),
        cta_url: promotionForm.cta_url.trim(),
        is_active: Boolean(promotionForm.is_active)
      };

      if (promotionForm.id) {
        await api.put(`/admin/visa-promotions/${promotionForm.id}`, payload);
      } else {
        await api.post('/admin/visa-promotions', payload);
      }

      setShowForm(false);
      await loadPromotions();
    } catch (err: any) {
      alert(getErrorMessage(err, 'Failed to save visa promotion.'));
    } finally {
      setSaving(false);
    }
  };

  const togglePromotion = async (promotion: VisaPromotion) => {
    try {
      await api.put(`/admin/visa-promotions/${promotion.id}`, {
        title: promotion.title,
        description: promotion.description || '',
        image_url: promotion.image_url || '',
        cta_label: promotion.cta_label || '',
        cta_url: promotion.cta_url || '',
        is_active: !promotion.is_active
      });
      await loadPromotions();
    } catch (err: any) {
      alert(getErrorMessage(err, 'Failed to update promotion status.'));
    }
  };

  const deletePromotion = async (promotion: VisaPromotion) => {
    if (!confirm('Delete this visa promotion popup?')) return;
    try {
      await api.delete(`/admin/visa-promotions/${promotion.id}`);
      await loadPromotions();
    } catch (err: any) {
      alert(getErrorMessage(err, 'Failed to delete visa promotion.'));
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-[#05162E]" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <header className="flex min-h-[78px] flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 sm:px-6 lg:px-10">
        <div className="flex min-w-0 items-center gap-4 sm:gap-5">
          <Link to="/admin" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-slate-50 hover:text-[#294b77]">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <JawaafLogo className="hidden h-9 w-auto sm:block" />
          <div className="min-w-0">
            <h1 className="truncate text-[20px] font-black sm:text-[22px]">Visa Promotion Popup</h1>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:text-[12px]">Manage student dashboard marketing popups</p>
          </div>
        </div>
        <button onClick={startCreate} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#294b77] px-4 py-3 text-[13px] font-black text-white">
          <Plus className="h-4 w-4" /> Add Popup
        </button>
      </header>

      <main className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_430px] lg:p-8">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 p-5">
            <div>
              <h2 className="text-[18px] font-black">Popup Library</h2>
              <p className="text-[12px] font-semibold text-slate-400">Students see the latest active popup after login.</p>
            </div>
            {loading && <Loader2 className="h-5 w-5 animate-spin text-slate-400" />}
          </div>

          <div className="grid gap-3 p-4 sm:p-5">
            {!loading && promotions.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center sm:p-10">
                <Megaphone className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 text-[15px] font-black text-slate-500">No visa popup added yet.</p>
                <button onClick={startCreate} className="mt-4 rounded-xl bg-[#294b77] px-4 py-3 text-[13px] font-black text-white">Create first popup</button>
              </div>
            )}

            {promotions.map(promotion => (
              <div key={promotion.id} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[160px_minmax(0,1fr)]">
                <div className="aspect-[4/3] overflow-hidden rounded-xl bg-[#EFF4FB]">
                  {promotion.image_url ? (
                    <img src={promotion.image_url} alt={promotion.title} className="h-full w-full object-contain" />
                  ) : (
                    <div className="grid h-full place-items-center text-slate-300">
                      <ImageIcon className="h-10 w-10" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase ${promotion.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                          {promotion.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span className="text-[11px] font-black text-slate-400">{new Date(promotion.created_at).toLocaleDateString()}</span>
                      </div>
                      <h3 className="mt-3 break-words text-[18px] font-black">{promotion.title}</h3>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button onClick={() => editPromotion(promotion)} className="rounded-lg p-2 text-[#294b77] hover:bg-[#EFF4FB]" title="Edit popup">
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button onClick={() => deletePromotion(promotion)} className="rounded-lg p-2 text-rose-500 hover:bg-rose-50" title="Delete popup">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {promotion.description && <p className="mt-2 line-clamp-3 text-[13px] font-semibold leading-6 text-slate-600">{promotion.description}</p>}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button onClick={() => togglePromotion(promotion)} className={`rounded-xl px-3 py-2 text-[12px] font-black ${promotion.is_active ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {promotion.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    {promotion.cta_url && (
                      <a href={promotion.cta_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-xl bg-slate-50 px-3 py-2 text-[12px] font-black text-slate-600 hover:text-[#294b77]">
                        Link <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[18px] font-black">{showForm ? promotionForm.id ? 'Edit Popup' : 'Add Popup' : 'Popup Editor'}</h2>
              <p className="text-[12px] font-semibold text-slate-400">Use clear copy and one strong action link.</p>
            </div>
            {showForm && <button onClick={() => setShowForm(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-50"><X className="h-4 w-4" /></button>}
          </div>

          {showForm ? (
            <div className="grid gap-4">
              <label className="grid gap-2">
                <span className="text-[12px] font-black uppercase tracking-wider text-slate-500">Image</span>
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-[#F8FAFC]">
                  <div className="aspect-[4/3]">
                    {promotionForm.image_url ? (
                      <img src={promotionForm.image_url} alt="Promotion preview" className="h-full w-full object-contain" />
                    ) : (
                      <div className="grid h-full place-items-center text-center text-slate-400">
                        <span>
                          <ImageIcon className="mx-auto h-10 w-10" />
                          <span className="mt-2 block text-[12px] font-black">No image selected</span>
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-slate-200 p-3">
                    <label className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-[13px] font-black text-[#294b77] shadow-sm">
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                      Upload Image
                      <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden" onChange={event => uploadPromotionImage(event.target.files?.[0])} />
                    </label>
                  </div>
                </div>
              </label>

              <label className="grid gap-2">
                <span className="text-[12px] font-black uppercase tracking-wider text-slate-500">Image URL</span>
                <input value={promotionForm.image_url} onChange={event => setPromotionForm({ ...promotionForm, image_url: event.target.value })} placeholder="https://..." className="rounded-xl border border-slate-200 px-4 py-3 text-[14px] font-bold outline-none focus:border-[#294b77]" />
              </label>
              <label className="grid gap-2">
                <span className="text-[12px] font-black uppercase tracking-wider text-slate-500">Title</span>
                <input value={promotionForm.title} onChange={event => setPromotionForm({ ...promotionForm, title: event.target.value })} placeholder="Study abroad visa support" className="rounded-xl border border-slate-200 px-4 py-3 text-[14px] font-bold outline-none focus:border-[#294b77]" />
              </label>
              <label className="grid gap-2">
                <span className="text-[12px] font-black uppercase tracking-wider text-slate-500">Description</span>
                <textarea value={promotionForm.description} onChange={event => setPromotionForm({ ...promotionForm, description: event.target.value })} placeholder="Announce consultancy offers, deadlines, and counselling options." className="min-h-[110px] rounded-xl border border-slate-200 px-4 py-3 text-[14px] font-semibold outline-none focus:border-[#294b77]" />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-[12px] font-black uppercase tracking-wider text-slate-500">CTA Label</span>
                  <input value={promotionForm.cta_label} onChange={event => setPromotionForm({ ...promotionForm, cta_label: event.target.value })} placeholder="Book Counselling" className="rounded-xl border border-slate-200 px-4 py-3 text-[14px] font-bold outline-none focus:border-[#294b77]" />
                </label>
                <label className="grid gap-2">
                  <span className="text-[12px] font-black uppercase tracking-wider text-slate-500">CTA Link</span>
                  <input value={promotionForm.cta_url} onChange={event => setPromotionForm({ ...promotionForm, cta_url: event.target.value })} placeholder="https://..." className="rounded-xl border border-slate-200 px-4 py-3 text-[14px] font-bold outline-none focus:border-[#294b77]" />
                </label>
              </div>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-[13px] font-black">
                <input type="checkbox" checked={promotionForm.is_active} onChange={event => setPromotionForm({ ...promotionForm, is_active: event.target.checked })} />
                Active on student dashboard
              </label>
              <button onClick={savePromotion} disabled={saving || uploading} className="rounded-xl bg-[#294b77] px-5 py-3 text-[14px] font-black text-white disabled:opacity-60">
                {saving ? <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> : <Save className="mr-2 inline h-4 w-4" />}
                Save Popup
              </button>
            </div>
          ) : (
            <button onClick={startCreate} className="grid min-h-[260px] w-full place-items-center rounded-2xl border border-dashed border-slate-200 bg-[#F8FAFC] text-center text-slate-500 hover:border-[#294b77] hover:text-[#294b77]">
              <span>
                <Plus className="mx-auto h-8 w-8" />
                <span className="mt-2 block text-[14px] font-black">Create or edit a visa popup</span>
              </span>
            </button>
          )}
        </section>
      </main>
    </div>
  );
}
