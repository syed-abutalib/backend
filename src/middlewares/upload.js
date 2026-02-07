import multer from "multer";

// Configure storage
const storage = multer.memoryStorage();

// File filter for images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

export const uploadSingleImage = (fieldName) => upload.single(fieldName);
export const uploadMultipleImages = (fieldName, maxCount) =>
  upload.array(fieldName, maxCount);

export default upload;
