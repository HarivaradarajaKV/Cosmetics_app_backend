const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Configure multer for memory storage (instead of disk storage)
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
});

// Helper function to upload file to Supabase Storage
const uploadToSupabase = async (file, folder = 'profile-photos') => {
    try {
        const filename = `${folder}/${Date.now()}-${Math.round(Math.random() * 1E9)}-${file.originalname}`;
        
        const { data, error } = await supabase.storage
            .from('uploads')
            .upload(filename, file.buffer, {
                contentType: file.mimetype,
                cacheControl: '3600'
            });

        if (error) throw error;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('uploads')
            .getPublicUrl(filename);

        return publicUrl;
    } catch (error) {
        console.error('Error uploading to Supabase:', error);
        throw new Error('Failed to upload file');
    }
};

module.exports = { upload, uploadToSupabase }; 