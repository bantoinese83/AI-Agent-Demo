class AIChatApp {
    constructor() {
        this.messagesContainer = document.getElementById('messages');
        this.queryForm = document.getElementById('query-form');
        this.queryInput = document.getElementById('query-input');
        this.submitBtn = document.getElementById('submit-btn');
        this.statusText = document.getElementById('status-text');
        this.connectionStatus = document.getElementById('connection-status');

        this.apiBaseUrl = window.location.origin;
        this.isLoading = false;
        this.messageQueue = [];

        this.initializeEventListeners();
        this.initializeAutoResize();
        this.setupSuggestions();
        this.initializeIcons();
        this.checkServerHealth();
        this.addWelcomeAnimation();
    }

    initializeEventListeners() {
        // Enhanced form submission
        this.queryForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });

        // Keyboard shortcuts
        this.queryInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSubmit();
            }

            if (e.key === 'Escape') {
                this.queryInput.blur();
            }
        });

        // Focus management
        this.queryInput.addEventListener('focus', () => {
            this.queryForm.classList.add('focused');
        });

        this.queryInput.addEventListener('blur', () => {
            this.queryForm.classList.remove('focused');
        });

        // Prevent form submission on paste with newlines
        this.queryInput.addEventListener('paste', (e) => {
            setTimeout(() => {
                this.updateTextareaHeight();
            }, 0);
        });
    }

    initializeAutoResize() {
        this.queryInput.addEventListener('input', () => {
            this.updateTextareaHeight();
        });
    }

    updateTextareaHeight() {
        this.queryInput.style.height = 'auto';
        const scrollHeight = this.queryInput.scrollHeight;
        const maxHeight = 120;

        if (scrollHeight <= maxHeight) {
            this.queryInput.style.height = scrollHeight + 'px';
        } else {
            this.queryInput.style.height = maxHeight + 'px';
        }

        // Add expanded class for styling
        if (scrollHeight > 48) {
            this.queryInput.classList.add('expanded');
        } else {
            this.queryInput.classList.remove('expanded');
        }
    }

    async handleSubmit() {
        if (this.isLoading) return;

        const query = this.queryInput.value.trim();
        if (!query) return;

        // Add user message immediately
        this.addMessage(query, 'user-message');

        // Hide suggestions after first interaction
        if (this.suggestionsContainer) {
            this.suggestionsContainer.style.opacity = '0';
            this.suggestionsContainer.style.transform = 'translateY(-20px)';
            this.suggestionsContainer.style.pointerEvents = 'none';

            setTimeout(() => {
                this.suggestionsContainer.style.display = 'none';
            }, 300);
        }

        // Clear input and reset height
        this.queryInput.value = '';
        this.updateTextareaHeight();

        this.setLoading(true);

        try {
            // Add typing indicator
            const typingIndicator = this.addTypingIndicator();

            const response = await this.sendQuery(query);

            // Remove typing indicator
            this.removeTypingIndicator(typingIndicator);

            if (response.success) {
                // Add response with animation delay for better UX
                setTimeout(() => {
                    this.addMessage(response.response, 'bot-message');
                    this.setStatus('Ready', 'success');
                }, 300);
            } else {
                throw new Error(response.message || 'Unknown error');
            }
        } catch (error) {
            console.error('Query error:', error);
            this.addErrorMessage(error.message);
            this.setStatus('Connection issue', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    async sendQuery(query) {
        const response = await fetch(`${this.apiBaseUrl}/api/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        return await response.json();
    }

    addTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot-message typing-indicator';
        typingDiv.innerHTML = `
            <div class="message-avatar">●</div>
            <div class="message-content">
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;

        this.messagesContainer.appendChild(typingDiv);
        this.scrollToBottom();

        return typingDiv;
    }

    removeTypingIndicator(indicator) {
        if (indicator && indicator.parentNode) {
            indicator.remove();
        }
    }

    setupSuggestions() {
        if (!this.suggestionsContainer) return;

        // Add click handlers to suggestions
        const suggestionItems = this.suggestionsContainer.querySelectorAll('.suggestion-item');
        suggestionItems.forEach(item => {
            item.addEventListener('click', () => {
                const suggestion = item.getAttribute('data-suggestion');
                if (suggestion) {
                    this.queryInput.value = suggestion;
                    this.queryInput.focus();
                    this.adjustTextareaHeight();

                    // Trigger submit after a short delay
                    setTimeout(() => {
                        this.handleSubmit();
                    }, 100);
                }
            });

            // Add keyboard navigation
            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    item.click();
                }
            });

            // Make suggestions focusable
            item.setAttribute('tabindex', '0');
        });

        // Animate suggestions on load
        this.animateSuggestions();
    }

    animateSuggestions() {
        const suggestions = this.suggestionsContainer.querySelectorAll('.suggestion-item');
        suggestions.forEach((item, index) => {
            item.style.opacity = '0';
            item.style.transform = 'translateY(20px)';

            setTimeout(() => {
                item.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
                item.style.opacity = '1';
                item.style.transform = 'translateY(0)';
            }, 200 + (index * 100)); // Stagger animation
        });
    }

    initializeIcons() {
        console.log('Initializing icons...');
        // Initialize suggestion icons
        const iconMappings = {
            'gamepad-icon': 'gamepad',
            'mic-icon': 'mic',
            'code-icon': 'code',
            'zap-icon': 'zap',
            'send-icon': 'send',
            'arrow-right-icon-1': 'arrowRight',
            'arrow-right-icon-2': 'arrowRight',
            'arrow-right-icon-3': 'arrowRight',
            'arrow-right-icon-4': 'arrowRight'
        };

        Object.entries(iconMappings).forEach(([elementId, iconName]) => {
            const element = document.getElementById(elementId);
            if (element && window.createIcon) {
                console.log(`Creating icon ${iconName} for element ${elementId}`);
                const iconHTML = window.createIcon(iconName, 24, 'suggestion-icon-element');
                element.innerHTML = iconHTML;
                console.log(`Icon HTML: ${iconHTML}`);
            } else {
                console.log(`Element ${elementId} or createIcon function not found`);
            }
        });
    }

    addWelcomeAnimation() {
        // Animate header section
        const headerSection = document.querySelector('.header-section');
        if (headerSection) {
            headerSection.style.opacity = '0';
            headerSection.style.transform = 'translateY(20px)';

            setTimeout(() => {
                headerSection.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
                headerSection.style.opacity = '1';
                headerSection.style.transform = 'translateY(0)';
            }, 100);
        }

        // Animate input section
        const inputSection = document.querySelector('.input-section');
        if (inputSection) {
            inputSection.style.opacity = '0';
            inputSection.style.transform = 'translateY(20px)';

            setTimeout(() => {
                inputSection.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
                inputSection.style.opacity = '1';
                inputSection.style.transform = 'translateY(0)';
            }, 600);
        }

        // Add page load animation
        document.body.style.opacity = '0';
        document.body.style.transform = 'translateY(10px)';

        setTimeout(() => {
            document.body.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
            document.body.style.opacity = '1';
            document.body.style.transform = 'translateY(0)';
        }, 50);
    }

    async checkServerHealth() {
        try {
            const response = await fetch('/health');
            const data = await response.json();

            if (data.status === 'healthy') {
                this.setStatus('Connected', 'success');
            } else if (data.status === 'degraded') {
                this.setStatus('Connected', 'loading');
            } else {
                // Only show error for truly unhealthy status
                this.setStatus('Connection Issue', 'error');
            }
        } catch (error) {
            console.error('Health check failed:', error);
            this.setStatus('Disconnected', 'error');
        }
    }

    addMessage(content, className) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${className}`;
        messageDiv.style.opacity = '0';
        messageDiv.style.transform = 'translateY(20px)';

        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'message-avatar';

        // Use icon avatars
        const avatarIcon = className === 'user-message' ? 'user' : 'bot';
        avatarDiv.innerHTML = window.createIcon ? window.createIcon(avatarIcon, 32) : (className === 'user-message' ? '👤' : '🤖');

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = content;

        // Format message content
        this.formatMessageContent(contentDiv);

        if (className === 'user-message') {
            messageDiv.appendChild(contentDiv);
            messageDiv.appendChild(avatarDiv);
        } else {
            messageDiv.appendChild(avatarDiv);
            messageDiv.appendChild(contentDiv);
        }

        this.messagesContainer.appendChild(messageDiv);

        // Animate in
        setTimeout(() => {
            messageDiv.style.transition = 'all 0.4s ease-out';
            messageDiv.style.opacity = '1';
            messageDiv.style.transform = 'translateY(0)';
        }, 50);

        this.scrollToBottom();
        return messageDiv;
    }

    formatMessageContent(contentDiv) {
        // Add basic formatting for better readability
        const content = contentDiv.textContent;

        // Convert URLs to links
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const formattedContent = content.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener">$1</a>');

        // Convert line breaks
        const lineBreakContent = formattedContent.replace(/\n/g, '<br>');

        contentDiv.innerHTML = lineBreakContent;
    }

    addErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v4"/>
                <path d="M12 16h.01"/>
            </svg>
            <span>${this.escapeHtml(message)}</span>
        `;

        this.messagesContainer.appendChild(errorDiv);
        this.scrollToBottom();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    setLoading(loading) {
        this.isLoading = loading;
        this.submitBtn.disabled = loading;

        if (loading) {
            this.submitBtn.innerHTML = `
                <div class="loading"></div>
                <span>Processing...</span>
            `;
            this.setStatus('Thinking', 'loading');
        } else {
            this.submitBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 2L11 13"/>
                    <path d="M22 2L15 22L11 13L2 9"/>
                </svg>
                <span>Send</span>
            `;
            this.setStatus('Ready', 'success');
        }
    }

    setStatus(message, type) {
        this.statusText.textContent = message;

        // Remove existing classes
        this.connectionStatus.className = 'status-dot';

        // Add new status class with better visual feedback
        switch (type) {
            case 'success':
                this.connectionStatus.classList.add('success');
                this.statusText.textContent = 'Connected';
                break;
            case 'error':
                this.connectionStatus.classList.add('error');
                this.statusText.textContent = 'Connection Issue';
                break;
            case 'loading':
                this.connectionStatus.classList.add('loading');
                this.statusText.textContent = 'Connecting...';
                break;
            default:
                this.connectionStatus.classList.add('success');
                this.statusText.textContent = 'Ready';
        }

        // Add subtle animation to status change
        this.connectionStatus.style.transform = 'scale(1.2)';
        setTimeout(() => {
            this.connectionStatus.style.transform = 'scale(1)';
        }, 200);
    }

    scrollToBottom() {
        // Smooth scroll to bottom
        this.messagesContainer.scrollTo({
            top: this.messagesContainer.scrollHeight,
            behavior: 'smooth'
        });
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AIChatApp();
});

// Add some utility functions
window.addEventListener('beforeunload', () => {
    console.log('AI Chat App shutting down...');
});
