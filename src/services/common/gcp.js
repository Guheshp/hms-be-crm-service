const { Storage } = require("@google-cloud/storage");

const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: process.env.GCP_KEY_FILE,
});

const bucketName = process.env.GCP_BUCKET_NAME;

const bucket = storage.bucket(bucketName);

const uploadProfileImage = async (file, userId) => {
  const extensionMap = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  const extension = extensionMap[file.mimetype];

  if (!extension) {
    throw new Error("Unsupported image type.");
  }

  const filename = `${userId}.${extension}`;
  const filepath = `profile-images/${filename}`;

  const gcsFile = bucket.file(filepath);

  await gcsFile.save(file.buffer, {
    metadata: {
      contentType: file.mimetype,
    },
    resumable: false,
  });

  return {
    filename,
    originalname: file.originalname,
    filepath,
    bucketname: bucketName,
    mimetype: file.mimetype,
    filesize: file.size,
  };
};

const getFileSignedUrl = async (filepath) => {
  if (!filepath) {
    return null;
  }

  const file = bucket.file(filepath);

  const [url] = await file.getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + 60 * 60 * 1000,
  });

  return url;
};

module.exports = {
  uploadProfileImage,
  getFileSignedUrl,
};
