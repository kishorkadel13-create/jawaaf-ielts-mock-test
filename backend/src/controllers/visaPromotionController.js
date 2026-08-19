import { supabaseAdmin } from '../config/supabase.js';

const VISA_PROMOTION_MIGRATION_MESSAGE = 'Database migration required: run backend/src/config/migrations/20260818_add_visa_promotions.sql and backend/src/config/migrations/20260819_add_visa_promotion_details.sql in Supabase, then reload the API schema cache.';

const isMissingVisaPromotionSchemaError = (error) => {
  const message = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`;
  return (
    error?.code === 'PGRST204' ||
    error?.code === 'PGRST205' ||
    (/visa_promotions/i.test(message) && /schema cache|column|relation|table/i.test(message))
  );
};

const cleanUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    return ['http:', 'https:'].includes(url.protocol) ? raw : null;
  } catch {
    return null;
  }
};

const buildPromotionPayload = (body, userId) => {
  const title = String(body.title || '').trim();
  const description = String(body.description || '').trim();
  const imageUrl = cleanUrl(body.image_url);
  const countryName = String(body.country_name || '').trim();
  const countryFlag = String(body.country_flag || '').trim();
  const studentQuote = String(body.student_quote || '').trim();
  const instituteName = String(body.institute_name || '').trim();
  const ctaLabel = String(body.cta_label || '').trim();
  const ctaUrl = cleanUrl(body.cta_url);

  return {
    title,
    description: description || null,
    image_url: imageUrl,
    country_name: countryName || null,
    country_flag: countryFlag || null,
    student_quote: studentQuote || null,
    institute_name: instituteName || null,
    cta_label: ctaLabel || null,
    cta_url: ctaUrl,
    is_active: Boolean(body.is_active),
    ...(userId ? { created_by: userId } : {})
  };
};

export const getActiveVisaPromotion = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('visa_promotions')
      .select('id, title, description, image_url, country_name, country_flag, student_quote, institute_name, cta_label, cta_url, updated_at, created_at')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      if (isMissingVisaPromotionSchemaError(error)) {
        return res.status(200).json(null);
      }
      throw error;
    }

    res.status(200).json(data || null);
  } catch (err) {
    console.error('getActiveVisaPromotion Error:', err);
    res.status(500).json({
      error: 'VisaPromotionLoadError',
      message: err.message || 'Failed to load visa promotion.'
    });
  }
};

export const getAdminVisaPromotions = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('visa_promotions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (isMissingVisaPromotionSchemaError(error)) {
        return res.status(500).json({
          error: 'SchemaMigrationRequired',
          message: VISA_PROMOTION_MIGRATION_MESSAGE
        });
      }
      throw error;
    }

    res.status(200).json(data || []);
  } catch (err) {
    console.error('getAdminVisaPromotions Error:', err);
    res.status(500).json({
      error: 'VisaPromotionAdminLoadError',
      message: err.message || 'Failed to load visa promotions.'
    });
  }
};

export const createVisaPromotion = async (req, res) => {
  try {
    const payload = buildPromotionPayload(req.body, req.user?.id);

    if (!payload.title) {
      return res.status(400).json({ error: 'BadRequest', message: 'Promotion title is required.' });
    }

    const { data, error } = await supabaseAdmin
      .from('visa_promotions')
      .insert(payload)
      .select()
      .single();

    if (error) {
      if (isMissingVisaPromotionSchemaError(error)) {
        return res.status(500).json({
          error: 'SchemaMigrationRequired',
          message: VISA_PROMOTION_MIGRATION_MESSAGE
        });
      }
      throw error;
    }

    res.status(201).json(data);
  } catch (err) {
    console.error('createVisaPromotion Error:', err);
    res.status(500).json({
      error: 'VisaPromotionCreateError',
      message: err.message || 'Failed to create visa promotion.'
    });
  }
};

export const updateVisaPromotion = async (req, res) => {
  try {
    const { promotionId } = req.params;
    const updates = {
      ...buildPromotionPayload(req.body),
      updated_at: new Date().toISOString()
    };
    delete updates.created_by;

    if (!updates.title) {
      return res.status(400).json({ error: 'BadRequest', message: 'Promotion title is required.' });
    }

    const { data, error } = await supabaseAdmin
      .from('visa_promotions')
      .update(updates)
      .eq('id', promotionId)
      .select()
      .single();

    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    console.error('updateVisaPromotion Error:', err);
    res.status(500).json({
      error: 'VisaPromotionUpdateError',
      message: err.message || 'Failed to update visa promotion.'
    });
  }
};

export const deleteVisaPromotion = async (req, res) => {
  try {
    const { promotionId } = req.params;
    const { error } = await supabaseAdmin
      .from('visa_promotions')
      .delete()
      .eq('id', promotionId);

    if (error) throw error;
    res.status(200).json({ message: 'Visa promotion deleted successfully.' });
  } catch (err) {
    console.error('deleteVisaPromotion Error:', err);
    res.status(500).json({
      error: 'VisaPromotionDeleteError',
      message: err.message || 'Failed to delete visa promotion.'
    });
  }
};
