const express = require("express");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const sharp = require("sharp");
const faceapi = require("face-api.js");
const tf = require("@tensorflow/tfjs-node");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
app.use(cors());

// Cấu hình Multer
const upload = multer({ dest: "uploads/" });

// Cấu hình Cloudinary
cloudinary.config({
    cloud_name: "your-cloud-name",
    api_key: "your-api-key",
    api_secret: "your-api-secret"
});

// Load model AI nhận diện khuôn mặt
const MODEL_URL = "./models";
(async () => {
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_URL);
})();

// API upload video và tạo thumbnail
app.post("/upload", upload.single("video"), async (req, res) => {
    const videoPath = req.file.path;
    const timestamps = Array.from({ length: 10 }, (_, i) => i * 10 + 5); // 10 ảnh
    const thumbnails = [];

    // Tạo thư mục nếu chưa có
    if (!fs.existsSync("thumbnails")) {
        fs.mkdirSync("thumbnails");
    }

    try {
        for (let i = 0; i < timestamps.length; i++) {
            const filename = `thumbnails/thumb_${i}.jpg`;
            await new Promise((resolve, reject) => {
                ffmpeg(videoPath)
                    .screenshots({
                        timestamps: [timestamps[i]],
                        filename: path.basename(filename),
                        folder: "thumbnails",
                        size: "1280x720",
                    })
                    .on("end", resolve)
                    .on("error", reject);
            });
            thumbnails.push(filename);
        }

        fs.unlinkSync(videoPath);

        // Chọn ảnh đẹp nhất bằng AI
        const bestThumbnail = await chooseBestThumbnail(thumbnails);

        // Upload ảnh lên Cloudinary
        const uploadedImage = await cloudinary.uploader.upload(bestThumbnail);

        res.json({ thumbnails, bestThumbnail: uploadedImage.secure_url });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Phân tích và chọn ảnh đẹp nhất
async function chooseBestThumbnail(thumbnails) {
    let bestImage = "";
    let bestScore = 0;

    for (let file of thumbnails) {
        const image = sharp(file);
        const { brightness, contrast, faces } = await analyzeImage(image);

        // Chấm điểm ảnh (ưu tiên ảnh có khuôn mặt, sáng rõ)
        const score = brightness * contrast + faces * 100;
        if (score > bestScore) {
            bestScore = score;
            bestImage = file;
        }
    }

    return bestImage;
}

// Phân tích ảnh bằng AI
async function analyzeImage(image) {
    const { channels } = await image.stats();
    let brightness = 0;
    let contrast = 0;

    for (let channel of channels) {
        brightness += channel.mean;
        contrast += channel.stddev;
    }

    brightness /= channels.length;
    contrast /= channels.length;

    // Nhận diện khuôn mặt
    const buffer = await image.toBuffer();
    const tensor = tf.node.decodeImage(buffer);
    const faces = await faceapi.detectAllFaces(tensor);

    return { brightness, contrast, faces: faces.length };
}

// Cung cấp ảnh thumbnail
app.use("/thumbnails", express.static("thumbnails"));

app.listen(5000, () => console.log("Server chạy tại http://localhost:5000"));
