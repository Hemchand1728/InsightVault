const API_BASE_URL = '';

document.addEventListener('DOMContentLoaded', () => {
    // Theme toggling
    const themeToggle = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;

    // Check system preference initially
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        htmlElement.classList.add('dark');
    }

    themeToggle.addEventListener('click', () => {
        htmlElement.classList.toggle('dark');
    });

    // File Upload handling
    const fileUpload = document.getElementById('file-upload');
    const dropZone = document.getElementById('drop-zone');
    const uploadStatus = document.getElementById('upload-status');
    const uploadStatusText = document.getElementById('upload-status-text');
    const statusIcon = uploadStatus.querySelector('i');

    fileUpload.addEventListener('change', handleFileUpload);
    
    // Drag and drop events
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-primary');
    });
    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-primary');
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-primary');
        if (e.dataTransfer.files.length) {
            fileUpload.files = e.dataTransfer.files;
            handleFileUpload();
        }
    });

    async function handleFileUpload() {
        const files = fileUpload.files;
        if (!files || files.length === 0) return;

        // Show loading status
        uploadStatus.classList.remove('hidden');
        uploadStatusText.textContent = `Uploading ${files.length} file(s)...`;
        statusIcon.className = "fa-solid fa-circle-notch fa-spin text-primary";

        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
            formData.append('files', files[i]);
        }

        try {
            const response = await fetch(`${API_BASE_URL}/upload`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                uploadStatusText.textContent = "Upload complete!";
                uploadStatusText.classList.replace('text-gray-600', 'text-green-600');
                uploadStatusText.classList.replace('dark:text-gray-300', 'dark:text-green-400');
                statusIcon.className = "fa-solid fa-check-circle text-green-500";
                fetchSources();
            } else {
                const errorDetail = typeof data.detail === 'object' ? JSON.stringify(data.detail) : data.detail;
                throw new Error(errorDetail || "Upload failed");
            }
        } catch (error) {
            uploadStatusText.textContent = `Error: ${error.message}`;
            uploadStatusText.classList.replace('text-gray-600', 'text-red-600');
            uploadStatusText.classList.replace('dark:text-gray-300', 'dark:text-red-400');
            statusIcon.className = "fa-solid fa-times-circle text-red-500";
        }

        // Reset status after 3 seconds
        setTimeout(() => {
            uploadStatus.classList.add('hidden');
            uploadStatusText.className = "text-gray-600 dark:text-gray-300";
        }, 3000);
    }

    // Sources listing
    const refreshSourcesBtn = document.getElementById('refresh-sources');
    const sourcesList = document.getElementById('sources-list');

    refreshSourcesBtn.addEventListener('click', fetchSources);

    async function fetchSources() {
        try {
            const response = await fetch(`${API_BASE_URL}/sources`);
            const data = await response.json();
            
            if (data.sources && data.sources.length > 0) {
                sourcesList.innerHTML = '';
                data.sources.forEach(source => {
                    const li = document.createElement('li');
                    li.className = "text-sm text-gray-700 dark:text-gray-300 flex items-center justify-between gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group";
                    const isPDF = source.toLowerCase().endsWith('.pdf');
                    const icon = isPDF ? 'fa-file-pdf text-red-500' : 'fa-file-lines text-blue-500';
                    
                    const leftDiv = document.createElement('div');
                    leftDiv.className = "flex items-center gap-2 overflow-hidden";
                    leftDiv.innerHTML = `<i class="fa-solid ${icon}"></i> <span class="truncate">${source}</span>`;
                    
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = "text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity";
                    deleteBtn.title = "Delete file";
                    deleteBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
                    deleteBtn.onclick = () => deleteSource(source);
                    
                    li.appendChild(leftDiv);
                    li.appendChild(deleteBtn);
                    
                    sourcesList.appendChild(li);
                });
            } else {
                sourcesList.innerHTML = '<li class="text-sm text-gray-500 dark:text-gray-400 italic">No sources added yet.</li>';
            }
        } catch (error) {
            console.error("Failed to fetch sources:", error);
        }
    }

    // Initial fetch
    fetchSources();

    window.deleteSource = async function(filename) {
        if (!confirm(`Are you sure you want to delete "${filename}"?`)) return;
        
        try {
            const response = await fetch(`${API_BASE_URL}/sources/${encodeURIComponent(filename)}`, {
                method: 'DELETE'
            });
            const data = await response.json();
            
            if (response.ok) {
                // Refresh list
                fetchSources();
            } else {
                alert(data.detail || "Failed to delete file.");
            }
        } catch (error) {
            console.error("Delete error:", error);
            alert("Error deleting file. Check if backend is running.");
        }
    };

    // Chat functionality
    const chatContainer = document.getElementById('chat-container');
    const queryInput = document.getElementById('query-input');
    const sendBtn = document.getElementById('send-btn');
    const welcomeScreen = document.getElementById('welcome-screen');
    let isWaitingForResponse = false;

    // Auto-resize textarea
    queryInput.addEventListener('input', function() {
        this.style.height = '52px';
        this.style.height = (this.scrollHeight) + 'px';
        sendBtn.disabled = this.value.trim() === '';
    });

    queryInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!sendBtn.disabled && !isWaitingForResponse) {
                handleSendQuery();
            }
        }
    });

    sendBtn.addEventListener('click', handleSendQuery);

    // Suggestions click
    document.querySelectorAll('.suggestion-card').forEach(card => {
        card.addEventListener('click', () => {
            queryInput.value = card.querySelector('p').textContent;
            queryInput.dispatchEvent(new Event('input'));
            handleSendQuery();
        });
    });

    async function handleSendQuery() {
        const query = queryInput.value.trim();
        if (!query) return;

        // Hide welcome screen if present
        if (welcomeScreen) {
            welcomeScreen.style.display = 'none';
        }

        // Add user message
        appendMessage('user', query);
        
        // Clear input and reset height
        queryInput.value = '';
        queryInput.style.height = '52px';
        sendBtn.disabled = true;
        isWaitingForResponse = true;

        // Add loading indicator
        const loadingId = appendLoadingIndicator();
        scrollToBottom();

        try {
            const response = await fetch(`${API_BASE_URL}/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ query: query })
            });

            const data = await response.json();
            
            // Remove loading indicator
            document.getElementById(loadingId).remove();
            
            if (response.ok) {
                appendMessage('ai', data.answer, data);
            } else {
                appendMessage('error', data.detail || "An error occurred while fetching the answer.");
            }
        } catch (error) {
            document.getElementById(loadingId).remove();
            appendMessage('error', "Cannot connect to the server. Is the backend running?");
        } finally {
            isWaitingForResponse = false;
            // Trigger input event to re-evaluate if button should be enabled
            queryInput.dispatchEvent(new Event('input'));
            scrollToBottom();
        }
    }

    function appendMessage(sender, text, metadata = null) {
        const wrapper = document.createElement('div');
        wrapper.className = `flex w-full mb-6 animate-fade-in-up ${sender === 'user' ? 'justify-end' : 'justify-start'}`;

        const isUser = sender === 'user';
        const isError = sender === 'error';
        
        let avatarHTML = '';
        let contentHTML = '';

        if (isUser) {
            avatarHTML = `<div class="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center ml-3 order-2">
                            <i class="fa-solid fa-user text-gray-500 dark:text-gray-400 text-sm"></i>
                          </div>`;
            contentHTML = `<div class="bg-primary text-white rounded-2xl rounded-tr-sm py-3 px-5 max-w-[85%] sm:max-w-[75%] shadow-sm">
                            <p class="text-sm whitespace-pre-wrap">${escapeHTML(text)}</p>
                           </div>`;
        } else {
            const avatarColor = isError ? 'bg-red-100 dark:bg-red-900/30 text-red-500' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-500';
            const iconClass = isError ? 'fa-exclamation-triangle' : 'fa-robot';
            
            avatarHTML = `<div class="w-8 h-8 rounded-full ${avatarColor} flex-shrink-0 flex items-center justify-center mr-3 mt-1">
                            <i class="fa-solid ${iconClass} text-sm"></i>
                          </div>`;
            
            // Format line breaks
            const formattedText = escapeHTML(text).replace(/\n/g, '<br>');
            
            let extraHTML = '';
            if (metadata && !isError) {
                if (metadata.sources && metadata.sources.length > 0) {
                    const sourceBadges = metadata.sources.map(s => 
                        `<span class="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-md text-[10px] font-medium mt-2 mr-2">
                            <i class="fa-solid fa-check-circle"></i> Grounded in ${escapeHTML(s)}
                         </span>`
                    ).join('');
                    
                    const confidenceColor = metadata.confidence > 80 ? 'text-green-500' : (metadata.confidence > 50 ? 'text-yellow-500' : 'text-red-500');
                    
                    // Add a button to view chunks
                    window.lastChunks = window.lastChunks || {};
                    const chunkId = 'chunk_' + Date.now();
                    window.lastChunks[chunkId] = metadata.chunks_used;
                    
                    extraHTML = `
                        <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-x-4 gap-y-2">
                            <div class="flex-1">${sourceBadges}</div>
                            <div class="flex items-center gap-4">
                                <span class="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                    <i class="fa-solid fa-bullseye ${confidenceColor}"></i> ${metadata.confidence}% Confidence
                                </span>
                                <button onclick="showChunks('${chunkId}')" class="text-xs font-medium text-primary hover:underline flex items-center gap-1">
                                    <i class="fa-solid fa-magnifying-glass"></i> View Context
                                </button>
                            </div>
                        </div>
                    `;
                }
            }

            contentHTML = `<div class="bg-white dark:bg-darkPanel border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-2xl rounded-tl-sm py-3 px-5 max-w-[90%] sm:max-w-[80%] shadow-sm overflow-hidden">
                            <div class="prose dark:prose-invert text-sm max-w-none">${formattedText}</div>
                            ${extraHTML}
                           </div>`;
        }

        wrapper.innerHTML = avatarHTML + contentHTML;
        chatContainer.appendChild(wrapper);
    }

    function appendLoadingIndicator() {
        const id = 'loading-' + Date.now();
        const wrapper = document.createElement('div');
        wrapper.id = id;
        wrapper.className = `flex w-full mb-6 animate-fade-in-up justify-start`;

        wrapper.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-500 flex-shrink-0 flex items-center justify-center mr-3 mt-1">
                <i class="fa-solid fa-robot text-sm"></i>
            </div>
            <div class="bg-white dark:bg-darkPanel border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-sm py-4 px-5 shadow-sm flex items-center">
                <div class="typing-indicator flex gap-1">
                    <span></span><span></span><span></span>
                </div>
            </div>
        `;
        
        chatContainer.appendChild(wrapper);
        return id;
    }

    function scrollToBottom() {
        chatContainer.scrollTo({
            top: chatContainer.scrollHeight,
            behavior: 'smooth'
        });
    }

    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }
});

// Modal Logic for displaying chunks
const sourcesModal = document.getElementById('sources-modal');
const closeModalBtn = document.getElementById('close-modal');
const modalContent = document.getElementById('modal-content');

closeModalBtn.addEventListener('click', closeModal);
sourcesModal.addEventListener('click', (e) => {
    if (e.target === sourcesModal) closeModal();
});

function closeModal() {
    sourcesModal.classList.remove('opacity-100');
    sourcesModal.children[0].classList.remove('scale-100');
    setTimeout(() => {
        sourcesModal.classList.add('hidden');
    }, 300);
}

window.showChunks = function(chunkId) {
    const chunks = window.lastChunks[chunkId];
    if (!chunks || chunks.length === 0) return;

    modalContent.innerHTML = '';
    chunks.forEach((chunk, idx) => {
        const div = document.createElement('div');
        div.className = "p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700";
        
        const header = document.createElement('div');
        header.className = "flex justify-between items-center mb-2";
        header.innerHTML = `
            <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">Chunk ${idx + 1} • ${chunk.source}</span>
            <span class="text-xs text-gray-400">Distance: ${chunk.distance.toFixed(4)}</span>
        `;
        
        const text = document.createElement('p');
        text.className = "text-sm text-gray-800 dark:text-gray-200 leading-relaxed font-mono";
        // Highlight logic could be added here, for now just show text
        text.textContent = chunk.text;
        
        div.appendChild(header);
        div.appendChild(text);
        modalContent.appendChild(div);
    });

    sourcesModal.classList.remove('hidden');
    // small delay for transition to work
    setTimeout(() => {
        sourcesModal.classList.add('opacity-100');
        sourcesModal.children[0].classList.add('scale-100');
    }, 10);
};
