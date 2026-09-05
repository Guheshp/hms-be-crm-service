const db = require("../config/database.js");
const { statusCode } = require("../constants/common.js");
const AppError = require("../utils/appError.js");

const createFile = async ({
  filename,
  originalname,
  filepath,
  bucketname,
  mimetype,
  filesize,
  storageprovider = "GCP",
  createdby,
}) => {
  const now = Date.now();

  const query = `
    INSERT INTO files (
      filename,
      originalname,
      filepath,
      bucketname,
      mimetype,
      filesize,
      storageprovider,
      status,
      createdby,
      createdat,
      updatedat
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      $7,
      $8,
      $9,
      $10,
      $11
    )
    RETURNING *;
  `;

  const values = [
    filename,
    originalname,
    filepath,
    bucketname,
    mimetype,
    filesize,
    storageprovider,
    1,
    createdby,
    now,
    now,
  ];

  const { rows } = await db.runQuery(query, values);

  return rows[0];
};

const updateFile = async ({
  id,
  filename,
  originalname,
  filepath,
  bucketname,
  mimetype,
  filesize,
}) => {
  const now = Date.now();

  const query = `
    UPDATE files
    SET
      filename = $1,
      originalname = $2,
      filepath = $3,
      bucketname = $4,
      mimetype = $5,
      filesize = $6,
      updatedat = $7
    WHERE
      id = $8
      AND status = 1
    RETURNING *;
  `;

  const values = [
    filename,
    originalname,
    filepath,
    bucketname,
    mimetype,
    filesize,
    now,
    id,
  ];

  const { rows } = await db.runQuery(query, values);

  console.log("UPDATE FILE DB ROWS:", rows);

  if (!rows.length) {
    throw new AppError("File record not found.", statusCode.NOT_FOUND);
  }

  return rows[0];
};

module.exports = {
  createFile,
  updateFile,
};
