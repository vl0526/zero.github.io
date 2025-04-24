// === SỬ DỤNG LẠI NAMED IMPORTS CHUẨN ===
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/genai';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';
// === KẾT THÚC SỬA ĐỔI IMPORT ===


// --- DOM Elements ---
const promptInput = document.getElementById('prompt-input') as HTMLInputElement;
const apiKeyInput = document.getElementById('api-key-input') as HTMLInputElement;
const generateButton = document.getElementById('generate-button') as HTMLButtonElement;
const framesContainer = document.getElementById('frames-container')!;
const resultContainer = document.getElementById('result-container')!;
const downloadButton = document.getElementById('download-button') as HTMLButtonElement;
const tabs = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');
const statusBar = document.getElementById('status-bar') as HTMLDivElement;
const statusText = document.getElementById('status-text')!;
const progressFill = document.getElementById('progress-fill') as HTMLDivElement;
const statusDisplay = document.getElementById('status-display')!;
const framesPlaceholder = document.getElementById('frames-placeholder')!;
const outputPlaceholder = document.getElementById('output-placeholder')!;
const apiKeyInfo = document.getElementById('api-key-info')!;

// --- Constants ---
const API_KEY_STORAGE_KEY = 'geminiApiKey';
const API_KEY_TIMESTAMP_KEY = 'geminiApiKeyTimestamp';
const API_KEY_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const DEFAULT_FRAMES = 30;
const MAX_FRAMES = 60;

// --- State ---
// Sử dụng lại kiểu dữ liệu gốc từ named import
let genAIInstance: GoogleGenerativeAI | null = null;
let generating = false;
let currentFrames: { element: HTMLDivElement; data: Uint8ClampedArray; width: number; height: number }[] = [];
let finalGifUrl: string | null = null;

// --- API Key Management ---

function saveApiKey(key: string) {
    if (key) {
        localStorage.setItem(API_KEY_STORAGE_KEY, key);
        localStorage.setItem(API_KEY_TIMESTAMP_KEY, Date.now().toString());
        console.log('API Key saved.');
        updateApiKeyStatus(true, false);
        initializeGenAI(key);
    } else {
        clearApiKey();
    }
}

function clearApiKey() {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
    localStorage.removeItem(API_KEY_TIMESTAMP_KEY);
    genAIInstance = null; // Clear the GenAI instance
    updateApiKeyStatus(false, false);
    console.log('API Key cleared.');
}

function isApiKeyExpired(): boolean {
    const timestampStr = localStorage.getItem(API_KEY_TIMESTAMP_KEY);
    if (!timestampStr) {
        return true;
    }
    const timestamp = parseInt(timestampStr, 10);
    return (Date.now() - timestamp) > API_KEY_EXPIRATION_MS;
}

function getApiKey(): string | null {
    if (isApiKeyExpired()) {
        console.log('API Key expired or not set.');
        clearApiKey();
        return null;
    }
    return localStorage.getItem(API_KEY_STORAGE_KEY);
}

function updateApiKeyStatus(hasKey: boolean, isExpired: boolean) {
    if (!hasKey || isExpired) {
        generateButton.disabled = true;
        statusDisplay.textContent = isExpired
            ? 'API Key expired. Please enter it again.'
            : 'Please enter your Gemini API Key above to enable generation.';
        apiKeyInfo.style.color = 'var(--accent-color)';
    } else {
        generateButton.disabled = generating;
        statusDisplay.textContent = 'API Key is set. Ready to generate!';
         apiKeyInfo.style.color = '#666';
    }
}

function initializeGenAI(apiKey: string) {
    try {
        // Sử dụng lại constructor gốc
        genAIInstance = new GoogleGenerativeAI(apiKey);
        console.log('Gemini AI Initialized');
        updateApiKeyStatus(true, false);
    } catch (error) {
        console.error("Error initializing GoogleGenerativeAI:", error);
        statusDisplay.textContent = 'Failed to initialize AI. Check API Key or console.';
        genAIInstance = null;
        updateApiKeyStatus(false, false);
    }
}

// --- UI Functions --- (Giữ nguyên như phiên bản trước)

function setLoading(isLoading: boolean) {
    generating = isLoading;
    generateButton.classList.toggle('loading', isLoading);
    generateButton.disabled = isLoading || !getApiKey();
    generateButton.querySelector('span')!.textContent = isLoading ? 'Generating...' : 'Generate Magic';
    if (isLoading) {
      statusBar.style.display = 'flex';
      progressFill.style.width = '0%';
      statusText.textContent = 'Warming up the magic...';
    } else {
       // statusBar.style.display = 'none';
    }
}

function clearPreviousGeneration() {
    framesContainer.innerHTML = '';
    framesContainer.appendChild(framesPlaceholder);
    framesPlaceholder.style.display = 'block';
    resultContainer.innerHTML = '';
    resultContainer.appendChild(outputPlaceholder);
    outputPlaceholder.style.display = 'block';
    downloadButton.style.display = 'none';
    downloadButton.classList.remove('show');
    statusBar.style.display = 'none';
    if (finalGifUrl) {
        URL.revokeObjectURL(finalGifUrl);
        finalGifUrl = null;
    }
    currentFrames = [];
}

function addSparkle(element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    const sparkle = document.createElement('i');
    sparkle.className = 'sparkle fas fa-sparkle';
    sparkle.style.left = `${Math.random() * element.offsetWidth}px`;
    sparkle.style.top = `${Math.random() * element.offsetHeight}px`;

    element.appendChild(sparkle);
    setTimeout(() => sparkle.remove(), 800);
}

function updateProgress(current: number, total: number) {
    const percentage = total > 0 ? (current / total) * 100 : 0;
    progressFill.style.width = `${percentage}%`;
    statusText.textContent = `Generating frame ${current} of ${total}...`;
}

function switchTab(targetTab: 'frames' | 'output') {
     tabs.forEach(tab => {
        const isActive = tab.getAttribute('data-tab') === targetTab;
        tab.classList.toggle('active', isActive);
    });
    tabContents.forEach(content => {
        const isActive = content.id === `${targetTab}-content`;
        content.classList.toggle('active', isActive);
    });
}


// --- Generation Logic ---

async function generateMagic() {
    const apiKey = getApiKey();
    if (!apiKey) {
        statusDisplay.textContent = 'Cannot generate: API Key is missing or expired.';
        apiKeyInput.focus();
        return;
    }

    if (!genAIInstance) {
       initializeGenAI(apiKey);
       if(!genAIInstance) {
            return;
       }
    }

    const prompt = promptInput.value.trim();
    if (!prompt) {
        statusDisplay.textContent = 'Please enter a prompt describing your animation.';
        promptInput.focus();
        return;
    }

    clearPreviousGeneration();
    setLoading(true);
    switchTab('frames');

    let numFrames = DEFAULT_FRAMES;
    const lowerCasePrompt = prompt.toLowerCase();
    if (/\b(60|sixty)\s+frames?\b/.test(lowerCasePrompt) ||
        /\bmore\s+frames?\b/.test(lowerCasePrompt) ||
        /\blonger\s+animation\b/.test(lowerCasePrompt))
    {
        numFrames = MAX_FRAMES;
        console.log(`Detected request for more frames. Generating ${numFrames}.`);
    } else {
        console.log(`Generating default ${numFrames} frames.`);
    }


    try {
        const model = genAIInstance.getGenerativeModel({
            model: "gemini-1.5-flash",
             generationConfig: {
                temperature: 0.8,
                maxOutputTokens: 4096,
             },
             // Sử dụng lại HarmCategory và HarmBlockThreshold gốc từ import
             safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            ],
        });

        const fullPrompt = `Generate a sequence of ${numFrames} image frames for an animation depicting: ${prompt}.
Each frame should be a JSON object containing 'frame_number' (integer, starting from 1) and 'image' (a base64 encoded PNG string of size ~128x128px, simple doodle style). Output only the JSON objects, one per line. Ensure smooth transitions between frames.`;

        statusText.textContent = `Asking the magic AI for ${numFrames} frames...`;
        const stream = await model.generateContentStream(fullPrompt);

        let currentFrameIndex = 0;
        let buffer = '';
        framesPlaceholder.style.display = 'none';

        for await (const chunk of stream.stream) {
            if (chunk.promptFeedback?.blockReason) {
                throw new Error(`Generation blocked: ${chunk.promptFeedback.blockReason}. Rating: ${chunk.promptFeedback.safetyRatings?.[0]?.category} - ${chunk.promptFeedback.safetyRatings?.[0]?.probability}`);
            }

            const chunkText = chunk.text();
            buffer += chunkText;

            let lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.trim().startsWith('{') && line.trim().endsWith('}')) {
                    try {
                        const frameData = JSON.parse(line.trim());
                        if (frameData.image && typeof frameData.frame_number === 'number') {
                            currentFrameIndex++;
                            await displayFrame(frameData.image, frameData.frame_number, numFrames);
                            updateProgress(currentFrameIndex, numFrames);

                            if (Math.random() < 0.1) {
                                addSparkle(generateButton);
                            }
                        } else {
                            console.warn("Skipping invalid JSON data structure:", line);
                        }
                    } catch (e) {
                        console.warn("Skipping non-JSON line or parse error:", line, e);
                    }
                }
            }
        }

        if (buffer.trim().startsWith('{') && buffer.trim().endsWith('}')) {
             try {
                 const frameData = JSON.parse(buffer.trim());
                 if (frameData.image && typeof frameData.frame_number === 'number') {
                     currentFrameIndex++;
                     await displayFrame(frameData.image, frameData.frame_number, numFrames);
                     updateProgress(currentFrameIndex, numFrames);
                 }
             } catch (e) {
                 console.warn("Error parsing final buffer:", buffer, e);
             }
        }


        if (currentFrames.length > 0) {
            statusText.textContent = 'Assembling the final animation...';
            await createGif();
            statusText.textContent = `Magic complete! ${currentFrames.length} frames generated.`;
            switchTab('output');
        } else {
            statusText.textContent = 'No frames were generated. Check console or prompt.';
             outputPlaceholder.textContent = 'Failed to generate frames. Check the console for errors or try modifying your prompt.';
             outputPlaceholder.style.display = 'block';
             switchTab('output');
        }

    } catch (error: any) {
        console.error('Error generating content:', error);
        const errorMessage = error.message || 'Unknown error occurred';
        statusText.textContent = `Error: ${errorMessage}`;
        statusDisplay.textContent = `Error: ${errorMessage}. Check console for details.`;
        outputPlaceholder.textContent = `Error during generation: ${errorMessage}`;
        outputPlaceholder.style.display = 'block';
        switchTab('output');
        if (error.message && (error.message.toLowerCase().includes('api key not valid') || error.message.toLowerCase().includes('api key invalid'))) {
             statusDisplay.textContent = 'API Key is not valid. Please check and re-enter.';
             clearApiKey();
             apiKeyInput.value = '';
             apiKeyInput.focus();
        } else if (error.message && error.message.toLowerCase().includes('quota')) {
             statusDisplay.textContent = 'API Key quota exceeded. Please check your usage limits.';
        } else if (error.message && error.message.toLowerCase().includes('blocked')) {
             statusDisplay.textContent = `Generation blocked due to safety settings. Details: ${errorMessage}`;
        }
    } finally {
        setLoading(false);
    }
}

// --- displayFrame, createGif --- (Giữ nguyên như phiên bản trước)
async function displayFrame(base64Png: string, frameNumber: number, totalFrames: number): Promise<void> {
    return new Promise(async (resolve, reject) => {
        const frameDiv = document.createElement('div');
        frameDiv.classList.add('frame');

        const img = document.createElement('img');
        try {
            const blob = await fetch(`data:image/png;base64,${base64Png}`).then(res => {
                if (!res.ok) throw new Error(`Failed to fetch base64 image: ${res.statusText}`);
                return res.blob();
            });
            const url = URL.createObjectURL(blob);
            img.src = url;

            const frameNumSpan = document.createElement('span');
            frameNumSpan.classList.add('frame-number');
            frameNumSpan.textContent = `${frameNumber}`;

            frameDiv.appendChild(img);
            frameDiv.appendChild(frameNumSpan);
            framesContainer.appendChild(frameDiv);

            requestAnimationFrame(() => {
                frameDiv.classList.add('appear');
            });

            addSparkle(frameDiv);

            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                if (!ctx) {
                     console.error("Could not get 2D context for frame", frameNumber);
                     URL.revokeObjectURL(url);
                     return reject(new Error("Could not get 2D context"));
                }
                canvas.width = img.naturalWidth || 128;
                canvas.height = img.naturalHeight || 128;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                try {
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    currentFrames.push({
                        element: frameDiv,
                        data: imageData.data,
                        width: canvas.width,
                        height: canvas.height
                    });
                    currentFrames.sort((a, b) => parseInt(a.element.querySelector('.frame-number')!.textContent!) - parseInt(b.element.querySelector('.frame-number')!.textContent!));
                    resolve();
                } catch (imageDataError) {
                     console.error("Error getting ImageData for frame", frameNumber, imageDataError);
                     reject(imageDataError);
                } finally {
                     URL.revokeObjectURL(url);
                }
            };

            img.onerror = (err) => {
                console.error("Failed to load image for frame", frameNumber, err);
                URL.revokeObjectURL(url);
                reject(new Error(`Image load error for frame ${frameNumber}`));
            };

        } catch (fetchError) {
             console.error("Error fetching/creating blob for frame", frameNumber, fetchError);
             reject(fetchError);
        }
    });
}

async function createGif() {
    if (currentFrames.length === 0) return;

    const firstFrame = currentFrames[0];
    const width = firstFrame.width;
    const height = firstFrame.height;

    // Sử dụng lại GIFEncoder gốc từ import
    const gif = GIFEncoder();

    try {
        const sampleFrameCount = Math.min(currentFrames.length, 10);
        const paletteDataSize = width * height * 4 * sampleFrameCount;
        const combinedData = new Uint8ClampedArray(paletteDataSize);
        for (let i = 0; i < sampleFrameCount; i++) {
            const frameIndex = Math.floor(i * (currentFrames.length / sampleFrameCount));
            combinedData.set(currentFrames[frameIndex].data, width * height * 4 * i);
        }
        // Sử dụng lại quantize và applyPalette gốc từ import
        const palette = quantize(combinedData, 256, { format: 'rgba4444' });

        for (let i = 0; i < currentFrames.length; i++) {
            const frame = currentFrames[i];
            if (frame.width !== width || frame.height !== height) {
                console.warn(`Frame ${i+1} has different dimensions (${frame.width}x${frame.height}), expected ${width}x${height}. Skipping.`);
                continue;
            }
            const data = frame.data;
            const index = applyPalette(data, palette, 'rgba4444');
            gif.writeFrame(index, width, height, { palette, delay: 100 });
        }

    } catch (memError) {
         console.error("Error creating palette/GIF (potentially memory related):", memError);
         statusText.textContent = "Error creating GIF. Maybe too many/large frames.";
         return;
    }

    gif.finish();
    const buffer = gif.bytesView();

    const blob = new Blob([buffer], { type: 'image/gif' });
    if (finalGifUrl) URL.revokeObjectURL(finalGifUrl);
    finalGifUrl = URL.createObjectURL(blob);

    const gifImage = document.createElement('img');
    gifImage.src = finalGifUrl;
    gifImage.alt = 'Generated Animation';

    resultContainer.innerHTML = '';
    resultContainer.appendChild(gifImage);
    resultContainer.classList.add('appear');
    outputPlaceholder.style.display = 'none';

    downloadButton.style.display = 'flex';
    requestAnimationFrame(() => {
        downloadButton.classList.add('show');
    })

}


// --- Event Listeners --- (Giữ nguyên như phiên bản trước)

generateButton.addEventListener('click', generateMagic);
promptInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !generateButton.disabled) {
        generateMagic();
    }
});

apiKeyInput.addEventListener('input', () => {
    const key = apiKeyInput.value.trim();
    if (key) {
         saveApiKey(key);
    } else {
         clearApiKey();
    }
});

downloadButton.addEventListener('click', () => {
    if (finalGifUrl) {
        const a = document.createElement('a');
        a.href = finalGifUrl;
        const safePrompt = promptInput.value.trim().slice(0, 30).replace(/[^a-z0-9]/gi, '_').toLowerCase();
        a.download = `magic-gif-${safePrompt || 'animation'}-${Date.now()}.gif`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
});

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const targetTab = tab.getAttribute('data-tab') as 'frames' | 'output';
        switchTab(targetTab);
    });
});


// --- Initialization --- (Giữ nguyên như phiên bản trước)
function initializeApp() {
    console.log("Initializing App...");
    const storedApiKey = getApiKey();
    if (storedApiKey) {
        apiKeyInput.value = storedApiKey;
        initializeGenAI(storedApiKey);
    } else {
        updateApiKeyStatus(false, isApiKeyExpired());
    }
    clearPreviousGeneration();
}

// --- Run ---
initializeApp();
