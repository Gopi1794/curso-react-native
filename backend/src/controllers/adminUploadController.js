const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const getSupabase = () => createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const BUCKET = 'admin-uploads';

exports.uploadImage = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No se recibió ningún archivo' });
    }

    const supabase = getSupabase();
    const ext = path.extname(req.file.originalname) || '.jpg';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;

    const { error } = await supabase.storage
        .from(BUCKET)
        .upload(filename, req.file.buffer, {
            contentType: req.file.mimetype,
            upsert: false,
        });

    if (error) {
        console.error('Error subiendo imagen:', error);
        return res.status(500).json({ success: false, message: 'Error al subir la imagen' });
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
    res.json({ success: true, url: data.publicUrl });
};
