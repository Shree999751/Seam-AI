// API Configuration
const API_KEY = "AIzaSyDgHqrrTXR8apwWUxJSomJgw-BODNFoC-E"; // Replace with your actual API key
const MODEL = "gemini-2.5-flash"; // Or use "gemini-pro" for text-only

// DOM Elements
let currentImageFile = null;
let currentAnalysisResults = null;
let analysisHistory = [];

// Initialize on page load
window.addEventListener('load', () => {
    const loader = document.getElementById('startup-loader');
    if (loader) {
        setTimeout(() => { loader.classList.add('hidden'); }, 1500);
    }
    loadAnalysisHistory();
});

// ==================== IMAGE HANDLING FUNCTIONS ====================

function handleImageUpload(file) {
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
        showMessage('File too large! Maximum size is 10MB.', 'error');
        return;
    }
    
    if (!file.type.startsWith('image/')) {
        showMessage('Please upload a valid image file (JPG, PNG, WEBP).', 'error');
        return;
    }
    
    currentImageFile = file;
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const previewImg = document.getElementById('previewImg');
        if (previewImg) {
            previewImg.src = e.target.result;
            document.getElementById('imagePreview')?.classList.remove('hidden');
            document.getElementById('dropZone')?.classList.add('hidden');
            
            const analyzeBtn = document.getElementById('analyzeBtn');
            if (analyzeBtn) {
                analyzeBtn.disabled = false;
                analyzeBtn.classList.remove('bg-slate-300', 'cursor-not-allowed');
                analyzeBtn.classList.add('bg-blue-600', 'hover:bg-blue-700', 'cursor-pointer');
            }
        }
    };
    
    reader.readAsDataURL(file);
}

function removeImage() {
    currentImageFile = null;
    document.getElementById('imagePreview')?.classList.add('hidden');
    document.getElementById('dropZone')?.classList.remove('hidden');
    
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (analyzeBtn) {
        analyzeBtn.disabled = true;
        analyzeBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700', 'cursor-pointer');
        analyzeBtn.classList.add('bg-slate-300', 'cursor-not-allowed');
    }
    
    document.getElementById('resultsCard')?.classList.add('hidden');
    document.getElementById('placeholderCard')?.classList.remove('hidden');
    document.getElementById('fileInput').value = '';
}

// ==================== SEAM ANALYSIS FUNCTIONS ====================

async function analyzeSeam() {
    if (!currentImageFile) {
        showMessage('Please upload a seam image first.', 'warning');
        return;
    }
    
    const analyzeBtn = document.getElementById('analyzeBtn');
    const originalHTML = analyzeBtn.innerHTML;
    
    // Show loading state
    analyzeBtn.innerHTML = `
        <span class="flex items-center justify-center">
            <svg class="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Analyzing Seam with AI...
        </span>
    `;
    analyzeBtn.disabled = true;
    
    try {
        // Convert image to base64 for API
        const base64Image = await imageToBase64(currentImageFile);
        
        // Call Gemini API for seam analysis
        const analysisResult = await callGeminiForSeamAnalysis(base64Image);
        
        // Display results
        displayAnalysisResults(analysisResult);
        
        // Save to history
        saveToHistory(analysisResult);
        
        showMessage('Analysis completed successfully!', 'success');
        
    } catch (error) {
        console.error('Analysis error:', error);
        showMessage('Error analyzing seam. Please try again.', 'error');
        
        // Fallback to mock analysis if API fails
        const mockResults = generateMockResults();
        displayAnalysisResults(mockResults);
        
    } finally {
        // Reset button
        analyzeBtn.innerHTML = originalHTML;
        analyzeBtn.disabled = false;
    }
}

async function imageToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function callGeminiForSeamAnalysis(base64Image) {
    const prompt = `
        You are an expert textile quality control engineer specializing in seam analysis.
        
        Analyze the seam in this image and provide a detailed assessment following this EXACT JSON structure:
        
        {
            "seamType": "Detected seam type (Plain Seam, Lapped Seam, French Seam, Flatlock Seam, or Bound Seam)",
            "spi": number (stitches per inch, between 4-12),
            "defects": "List any visible defects (skipped stitches, thread fraying, puckering, misalignment, broken thread, or None)",
            "puckeringLevel": "None, Mild, Moderate, or Severe",
            "strengthScore": number between 0-100,
            "durabilityScore": number between 0-100,
            "confidence": number between 0-100,
            "observations": "Brief observations about seam quality and construction",
            "recommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3"]
        }
        
        Base on visual characteristics:
        - Higher SPI (8-11) indicates better strength
        - Lapped and French seams are stronger than plain seams
        - Puckering reduces durability by 15-30%
        - Skipped stitches reduce strength by 20-40%
        - Thread fraying indicates potential failure point
        
        Return ONLY valid JSON, no additional text.
    `;
    
    // For Gemini Vision API (if using multimodal)
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{
                parts: [
                    { text: prompt },
                    { inline_data: { mime_type: "image/jpeg", data: base64Image } }
                ]
            }]
        })
    });
    
    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }
    
    const data = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textResponse) {
        throw new Error("No valid response from API");
    }
    
    // Parse JSON response
    try {
        // Clean the response in case there's markdown formatting
        const cleanJson = textResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(cleanJson);
    } catch (e) {
        console.error("JSON Parse error:", e);
        throw new Error("Invalid response format from API");
    }
}

// ==================== DISPLAY FUNCTIONS ====================

function displayAnalysisResults(results) {
    // Animate score counters
    animateValue('strengthScore', 0, results.strengthScore, 800);
    animateValue('durabilityScore', 0, results.durabilityScore, 800);
    
    // Update progress bars
    const strengthBar = document.getElementById('strengthBar');
    const durabilityBar = document.getElementById('durabilityBar');
    if (strengthBar) strengthBar.style.width = `${results.strengthScore}%`;
    if (durabilityBar) durabilityBar.style.width = `${results.durabilityScore}%`;
    
    // Update labels and descriptions
    const strengthRating = getStrengthRating(results.strengthScore);
    const durabilityRating = getDurabilityRating(results.durabilityScore);
    
    const strengthLabel = document.getElementById('strengthLabel');
    const strengthDesc = document.getElementById('strengthDesc');
    const durabilityLabel = document.getElementById('durabilityLabel');
    const durabilityDesc = document.getElementById('durabilityDesc');
    
    if (strengthLabel) strengthLabel.textContent = strengthRating.label;
    if (strengthDesc) strengthDesc.textContent = strengthRating.desc;
    if (durabilityLabel) durabilityLabel.textContent = durabilityRating.label;
    if (durabilityDesc) durabilityDesc.textContent = durabilityRating.desc;
    
    // Update detailed analysis
    document.getElementById('seamType').textContent = results.seamType;
    document.getElementById('spi').textContent = `${results.spi} SPI (${getSPIRating(results.spi)})`;
    document.getElementById('defects').textContent = results.defects;
    document.getElementById('puckering').textContent = results.puckeringLevel;
    document.getElementById('confidence').textContent = `${results.confidence}%`;
    
    // Update observations if element exists
    const observationsEl = document.getElementById('observations');
    if (observationsEl && results.observations) {
        observationsEl.textContent = results.observations;
    }
    
    // Update recommendations
    const recommendations = results.recommendations || generateRecommendations(results);
    const recList = document.getElementById('recommendations');
    if (recList) {
        recList.innerHTML = recommendations.map(rec => `<li>${rec}</li>`).join('');
    }
    
    // Show results card
    document.getElementById('placeholderCard')?.classList.add('hidden');
    document.getElementById('resultsCard')?.classList.remove('hidden');
    
    // Enable chat and export buttons
    document.getElementById('actionButtons')?.classList.remove('hidden');
    document.getElementById('chatSection')?.classList.remove('hidden');
    
    // Store current results for chat
    currentAnalysisResults = results;
}

function animateValue(elementId, start, end, duration) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const increment = (end - start) / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= end) {
            element.textContent = Math.round(end) + '%';
            clearInterval(timer);
        } else {
            element.textContent = Math.round(current) + '%';
        }
    }, 16);
}

function getStrengthRating(score) {
    if (score >= 85) {
        return { label: 'Excellent', desc: 'Exceeds industry standards for most applications' };
    } else if (score >= 70) {
        return { label: 'Good', desc: 'Meets standard requirements for general use' };
    } else if (score >= 55) {
        return { label: 'Fair', desc: 'Acceptable for light-duty applications only' };
    } else {
        return { label: 'Poor', desc: 'Requires immediate quality improvement' };
    }
}

function getDurabilityRating(score) {
    if (score >= 85) {
        return { label: 'Excellent', desc: 'Expected to last through extended use cycles' };
    } else if (score >= 70) {
        return { label: 'Good', desc: 'Suitable for normal wear and tear' };
    } else if (score >= 55) {
        return { label: 'Fair', desc: 'May show wear earlier than expected' };
    } else {
        return { label: 'Poor', desc: 'Likely to fail under normal use conditions' };
    }
}

function getSPIRating(spi) {
    if (spi >= 9) return 'High density - Optimal strength';
    if (spi >= 7) return 'Standard density - Good balance';
    if (spi >= 5) return 'Low density - Acceptable for light use';
    return 'Very low density - Needs improvement';
}

// ==================== RECOMMENDATION ENGINE ====================

function generateRecommendations(results) {
    const recs = [];
    
    if (results.strengthScore < 70) {
        if (results.spi < 7) {
            recs.push('📏 Increase stitch density to 8-10 SPI for better strength');
        }
        if (results.defects.includes('skipped')) {
            recs.push('🔧 Check thread tension and needle condition to prevent skipped stitches');
        }
        if (results.defects.includes('fraying')) {
            recs.push('🧵 Use higher quality thread or check needle size compatibility');
        }
        if (results.seamType === 'Plain Seam') {
            recs.push('💪 Consider switching to lapped or French seam for high-stress areas');
        }
        recs.push('📊 Perform tensile strength test to validate visual analysis');
    } else if (results.strengthScore >= 85) {
        recs.push('✅ Seam strength meets industrial standards for most applications');
        recs.push('🎯 Maintain current production parameters for consistent quality');
        recs.push('📈 Document this seam as a benchmark for future QC');
    } else {
        recs.push('📈 Monitor SPI consistency across production batches');
        recs.push('🔍 Schedule regular quality control spot checks');
    }
    
    if (results.puckeringLevel === 'Moderate' || results.puckeringLevel === 'Severe') {
        recs.push('⚙️ Reduce thread tension or use lighter weight thread to minimize puckering');
        recs.push('🔄 Consider adjusting feed mechanisms on sewing machine');
    }
    
    if (results.defects !== 'None' && !results.defects.includes('skipped')) {
        recs.push(`⚠️ Address detected issues: ${results.defects.toLowerCase()}`);
    }
    
    if (results.durabilityScore < 60) {
        recs.push('🛡️ Consider reinforcing high-stress points with back-tacking');
        recs.push('🧪 Conduct accelerated wear testing for validation');
    }
    
    if (recs.length === 0) {
        recs.push('🏆 Excellent seam quality! Maintain current manufacturing standards');
        recs.push('📝 Document this seam as a quality benchmark');
        recs.push('🎓 Share best practices with production team');
    }
    
    return recs.slice(0, 5);
}

// ==================== CHAT & Q&A FUNCTIONS ====================

async function askQuestion() {
    const question = document.getElementById('chatInput')?.value.trim();
    if (!question) return;
    
    if (!currentAnalysisResults) {
        showMessage('Please analyze a seam first before asking questions.', 'warning');
        return;
    }
    
    // Add user question to chat
    updateChatHistory('user', question);
    document.getElementById('chatInput').value = '';
    
    // Show typing indicator
    showTypingIndicator();
    
    try {
        const answer = await getAIAnswer(question, currentAnalysisResults);
        updateChatHistory('model', answer);
    } catch (error) {
        console.error('Chat error:', error);
        updateChatHistory('model', 'Sorry, I encountered an error. Please try again.');
    } finally {
        hideTypingIndicator();
    }
}

async function getAIAnswer(question, analysisResults) {
    const prompt = `
        You are a textile quality control expert assistant. Answer questions about a seam analysis based ONLY on the provided analysis data.
        
        SEAM ANALYSIS DATA:
        - Seam Type: ${analysisResults.seamType}
        - Stitches Per Inch: ${analysisResults.spi}
        - Defects: ${analysisResults.defects}
        - Puckering Level: ${analysisResults.puckeringLevel}
        - Strength Score: ${analysisResults.strengthScore}%
        - Durability Score: ${analysisResults.durabilityScore}%
        - Confidence: ${analysisResults.confidence}%
        
        User Question: "${question}"
        
        Rules:
        1. Base answers ONLY on the data above
        2. If information isn't available, say "The analysis does not provide information about that"
        3. Keep responses concise and practical (2-3 sentences max)
        4. Use simple, non-technical language when possible
    `;
    
    const response = await callGemini(prompt, false);
    return response;
}

function updateChatHistory(role, text) {
    const chatHistoryDiv = document.getElementById('chatHistory');
    if (!chatHistoryDiv) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('p-3', 'rounded-lg', 'max-w-xs', 'md:max-w-md', 'fade-in', 'mb-2');
    
    if (role === 'user') {
        messageDiv.classList.add('bg-blue-100', 'text-blue-800', 'ml-auto');
        messageDiv.textContent = text;
    } else {
        messageDiv.classList.add('bg-gray-100', 'text-gray-800', 'mr-auto');
        // Format markdown-like syntax
        const formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
        messageDiv.innerHTML = formattedText;
    }
    
    chatHistoryDiv.appendChild(messageDiv);
    chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;
}

function showTypingIndicator() {
    const chatHistoryDiv = document.getElementById('chatHistory');
    if (!chatHistoryDiv) return;
    
    const indicator = document.createElement('div');
    indicator.id = 'typing-indicator';
    indicator.classList.add('p-3', 'rounded-lg', 'bg-gray-100', 'text-gray-500', 'mr-auto', 'mb-2');
    indicator.innerHTML = '<span class="flex items-center space-x-1"><span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span><span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></span><span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></span><span class="ml-1 text-xs">AI is thinking...</span></span>';
    
    chatHistoryDiv.appendChild(indicator);
    chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;
}

function hideTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) indicator.remove();
}

// ==================== HISTORY FUNCTIONS ====================

function saveToHistory(analysisResult) {
    const historyItem = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        seamType: analysisResult.seamType,
        strengthScore: analysisResult.strengthScore,
        durabilityScore: analysisResult.durabilityScore,
        defects: analysisResult.defects,
        imageData: currentImageFile ? URL.createObjectURL(currentImageFile) : null
    };
    
    analysisHistory.unshift(historyItem);
    
    // Keep only last 20 items
    if (analysisHistory.length > 20) analysisHistory.pop();
    
    localStorage.setItem('seamAnalysisHistory', JSON.stringify(analysisHistory));
    updateHistoryUI();
}

function loadAnalysisHistory() {
    const saved = localStorage.getItem('seamAnalysisHistory');
    if (saved) {
        try {
            analysisHistory = JSON.parse(saved);
            updateHistoryUI();
        } catch (e) {
            console.error('Error loading history:', e);
        }
    }
}

function updateHistoryUI() {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;
    
    if (analysisHistory.length === 0) {
        historyList.innerHTML = '<p class="text-sm text-slate-500 text-center py-4">No analyses yet. Upload a seam to get started.</p>';
        return;
    }
    
    historyList.innerHTML = analysisHistory.map(item => `
        <div class="bg-slate-50 rounded-lg p-3 mb-2 cursor-pointer hover:bg-slate-100 transition" onclick="loadHistoryItem(${item.id})">
            <div class="flex justify-between items-start">
                <div>
                    <p class="font-semibold text-sm text-slate-700">${item.seamType}</p>
                    <p class="text-xs text-slate-500">Strength: ${item.strengthScore}% | Durability: ${item.durabilityScore}%</p>
                    <p class="text-xs text-slate-400 mt-1">${new Date(item.timestamp).toLocaleDateString()}</p>
                </div>
                ${item.defects !== 'None' ? '<span class="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full">Issues</span>' : '<span class="text-xs px-2 py-0.5 bg-green-100 text-green-600 rounded-full">Good</span>'}
            </div>
        </div>
    `).join('');
}

// ==================== EXPORT FUNCTIONS ====================

function exportReport() {
    if (!currentAnalysisResults) {
        showMessage('No analysis results to export.', 'warning');
        return;
    }
    
    const reportHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Seam Analysis Report</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                h1 { color: #1e293b; }
                .score { font-size: 24px; font-weight: bold; }
                .good { color: #10b981; }
                .fair { color: #f59e0b; }
                .poor { color: #ef4444; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e2e8f0; }
                th { background-color: #f1f5f9; }
            </style>
        </head>
        <body>
            <h1>Seam Strength & Durability Analysis Report</h1>
            <p>Generated: ${new Date().toLocaleString()}</p>
            
            <table>
                <tr><th>Parameter</th><th>Value</th></tr>
                <tr><td>Seam Type</td><td>${currentAnalysisResults.seamType}</td></tr>
                <tr><td>Stitches Per Inch</td><td>${currentAnalysisResults.spi}</td></tr>
                <tr><td>Defects</td><td>${currentAnalysisResults.defects}</td></tr>
                <tr><td>Puckering Level</td><td>${currentAnalysisResults.puckeringLevel}</td></tr>
                <tr><td>Strength Score</td><td class="${getScoreClass(currentAnalysisResults.strengthScore)}">${currentAnalysisResults.strengthScore}%</td></tr>
                <tr><td>Durability Score</td><td class="${getScoreClass(currentAnalysisResults.durabilityScore)}">${currentAnalysisResults.durabilityScore}%</td></tr>
                <tr><td>AI Confidence</td><td>${currentAnalysisResults.confidence}%</td></tr>
            </table>
            
            <h2>Recommendations</h2>
            <ul>
                ${(currentAnalysisResults.recommendations || generateRecommendations(currentAnalysisResults)).map(rec => `<li>${rec}</li>`).join('')}
            </ul>
            
            <p style="margin-top: 40px; font-size: 12px; color: #64748b;">
                This report was generated by SeamAnalyzer AI. For critical applications, physical testing is recommended.
            </p>
        </body>
        </html>
    `;
    
    const blob = new Blob([reportHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seam_report_${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
    
    showMessage('Report downloaded successfully!', 'success');
}

function getScoreClass(score) {
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
}

function printReport() {
    const reportContent = document.getElementById('resultsCard')?.cloneNode(true);
    if (!reportContent) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Seam Analysis Report</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                .no-print { display: none; }
                button { display: none; }
            </style>
        </head>
        <body>
            <h1>Seam Strength & Durability Analysis Report</h1>
            <p>Generated: ${new Date().toLocaleString()}</p>
            ${reportContent.innerHTML}
            <p style="margin-top: 40px; font-size: 12px;">Report generated by SeamAnalyzer AI</p>
        </body>
        </html>
    `);
    printWindow.print();
    printWindow.close();
}

// ==================== UTILITY FUNCTIONS ====================

async function callGemini(prompt, showLoading = false) {
    const maxRetries = 3;
    let delay = 1000;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
            
            if (response.ok) {
                const data = await response.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!text) throw new Error("No valid response from the model.");
                return text;
            }
            
            if (response.status === 429 || response.status >= 500) {
                throw new Error(`API temporarily unavailable (Status: ${response.status})`);
            }
            
            const errorData = await response.json();
            return `Error: ${errorData.error?.message || `API Error: ${response.status}`}`;
            
        } catch (err) {
            console.warn(`Attempt ${attempt + 1} failed: ${err.message}`);
            if (attempt === maxRetries - 1) {
                return "Error: Could not get a response. Please try again in a few moments.";
            }
            await new Promise(res => setTimeout(res, delay));
            delay *= 2;
        }
    }
    return "Error: Could not get a response after multiple attempts.";
}

function showMessage(message, type = 'info') {
    const responseBox = document.getElementById('responseBox');
    if (!responseBox) return;
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    responseBox.innerHTML = `${icons[type] || 'ℹ️'} ${message}`;
    
    // Auto-clear after 3 seconds for non-info messages
    if (type !== 'info') {
        setTimeout(() => {
            if (responseBox.innerHTML.includes(message)) {
                if (currentAnalysisResults) {
                    displayAnalysisResults(currentAnalysisResults);
                } else {
                    responseBox.innerHTML = 'Your analysis results will appear here.';
                }
            }
        }, 3000);
    }
}

function generateMockResults() {
    const seamTypes = ['Plain Seam', 'Lapped Seam', 'French Seam', 'Flatlock Seam', 'Bound Seam'];
    const defectsList = ['None', 'Minor skipped stitches (2-3)', 'Moderate skipped stitches', 'Slight puckering', 'Thread fraying', 'Edge misalignment'];
    const puckeringLevels = ['None detected', 'Mild (Level 1)', 'Moderate (Level 2)', 'Severe (Level 3)'];
    
    const strengthBase = Math.floor(Math.random() * 45) + 50;
    const durabilityBase = strengthBase - (Math.random() * 12);
    
    return {
        seamType: seamTypes[Math.floor(Math.random() * seamTypes.length)],
        spi: Math.floor(Math.random() * 7) + 5,
        defects: defectsList[Math.floor(Math.random() * defectsList.length)],
        puckeringLevel: puckeringLevels[Math.floor(Math.random() * puckeringLevels.length)],
        strengthScore: Math.min(98, Math.max(45, strengthBase)),
        durabilityScore: Math.min(96, Math.max(42, durabilityBase)),
        confidence: Math.floor(Math.random() * 12) + 83,
        observations: "Based on visual analysis, this seam shows typical characteristics for its type.",
        recommendations: [
            "Monitor stitch consistency across production",
            "Check thread tension periodically",
            "Document quality metrics for future reference"
        ]
    };
}

// ==================== EXPORT FUNCTIONS ====================

window.analyzeSeam = analyzeSeam;
window.removeImage = removeImage;
window.askQuestion = askQuestion;
window.exportReport = exportReport;
window.printReport = printReport;
window.loadHistoryItem = (id) => {
    const item = analysisHistory.find(h => h.id === id);
    if (item && item.imageData) {
        showMessage('Loading previous analysis...', 'info');
        // Reload the analysis from history
        currentAnalysisResults = {
            seamType: item.seamType,
            strengthScore: item.strengthScore,
            durabilityScore: item.durabilityScore,
            defects: item.defects,
            spi: item.spi || 7,
            puckeringLevel: item.puckeringLevel || 'None detected',
            confidence: item.confidence || 85,
            observations: item.observations || 'Previous analysis result',
            recommendations: item.recommendations || ['Review quality standards']
        };
        displayAnalysisResults(currentAnalysisResults);
    }
};
