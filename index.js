const http = require('http');
const Busboy = require('busboy');
const express = require('express');
const uuidv4 = require('uuid/v4')
const AWS = require('aws-sdk');
const path = require('path')

// AWS S3 Config
AWS.config.update(
   {
      accessKeyId: 'AWS_ACCESS_KEY',
      secretAccessKey: 'AWS_SECRET_KEY',
      region: 'S3_REGION_NAME'
   }
);

const BUCKET_NAME = 'S3_BUCKET_NAME';
const DIRECTORY = 'dir1/'; // directory name
const S3 = new AWS.S3();

// Init Express
const app = express();

app.get('/', function (req, res) {
   res.writeHead(200, { Connection: 'close' });
   res.end(`
   <html>
     <head></head>
     <body>
       <form action="upload" method="POST" enctype="multipart/form-data">
         <input type="text" name="textfield" placeholder="insert file title"><br />
         <input type="file" name="filefield"><br />
         <input type="submit">
       </form>
     </body>
   </html>
 `);
});

app.post("/upload", (req, res) => {
   let chunks = [], uploadName, uploadType, uploadEncoding;
   const busboy = Busboy({ headers: req.headers });

   busboy.on('file', (name, file, info) => {
      const { filename, encoding, mimeType } = info;
      console.log(
         `File [${name}]: filename: %j, encoding: %j, mimeType: %j`,
         filename,
         encoding,
         mimeType
      );
      uploadName = filename;
      uploadType = mimeType;
      uploadEncoding = encoding;

      file.on('data', (data) => {
         console.log(`File [${name}] got ${data.length} bytes`);
         console.log(chunks.length);
         chunks.push(data)
      }).on('close', () => {
         console.log(`File [${name}] done`);
      });
   });

   busboy.on('field', (name, val, info) => {
      console.log(`Field [${name}]: value: %j`, val);
   });

   // Start uploading to AWS S3
   // Access file : https://BUCKET_NAME.s3.region.amazonaws.com/filename.jpg|.doc|.csv|.pdf
   busboy.on('finish', function () {
      const params = {
         Bucket: BUCKET_NAME, // required | your s3 bucket name
         Body: Buffer.concat(chunks), // concatinating all chunks
         Key: DIRECTORY + uuidv4() + path.extname(uploadName), // required
         ACL: 'public-read', // required
         ContentType: uploadType, // required
         // ContentEncoding: uploadEncoding, // optional
      }
      S3.upload(params, (err, s3res) => {
         if (err) {
            res.send({ err, status: 'error' });
         } else {
            res.send({ data: s3res, status: 'success', msg: 'File successfully uploaded.' });
         }
      });

   });

   req.pipe(busboy);

});

// Start Server
var server = app.listen(3000, function () {
   // var host = server.address().address
   var host = 'localhost';
   var port = server.address().port;
   console.log('App listening at http://%s:%s', host, port)
});