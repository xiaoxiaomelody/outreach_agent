import React, { useState, useRef, useEffect } from 'react';
import './ChatSearch.css';

/**
 * Chat Search Component
 * Natural language interface for contact search
 */
const ChatSearch = ({ onSearch, isSearching }) => {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([
        {
            type: 'assistant',
            text: '👋 Hi! I can help you find contacts. Try asking me something like:',
            timestamp: new Date()
        },
        {
            type: 'suggestions',
            suggestions: [
                'Find 10 engineers at Google',
                'Show me marketing people at Stripe',
                'Get senior executives from Microsoft',
                'Find contacts at Amazon'
            ],
            timestamp: new Date()
        }
    ]);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!input.trim() || isSearching) return;

        const userMessage = input.trim();
        setInput('');

        // Add user message to chat
        const newUserMessage = {
            type: 'user',
            text: userMessage,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, newUserMessage]);

        // Add thinking message
        const thinkingMessage = {
            type: 'assistant',
            text: '🤔 Understanding your query...',
            isThinking: true,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, thinkingMessage]);

        // Call the search function
        try {
            const result = await onSearch(userMessage);
            
            // Remove thinking message
            setMessages(prev => prev.filter(m => !m.isThinking));

            if (result.success) {
                // Add success message
                const resultMessage = {
                    type: 'assistant',
                    text: `✅ Found ${result.data.resultCount} contacts at ${result.data.parsedCriteria.company}!`,
                    parsedCriteria: result.data.parsedCriteria,
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, resultMessage]);
            } else {
                // Add error message
                const errorMessage = {
                    type: 'assistant',
                    text: `❌ ${result.error || 'Failed to find contacts'}`,
                    error: true,
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, errorMessage]);

                if (result.suggestion) {
                    setMessages(prev => [...prev, {
                        type: 'assistant',
                        text: `💡 ${result.suggestion}`,
                        timestamp: new Date()
                    }]);
                }
            }
        } catch (error) {
            // Remove thinking message
            setMessages(prev => prev.filter(m => !m.isThinking));
            
            const errorMessage = {
                type: 'assistant',
                text: `❌ Something went wrong. Please try again.`,
                error: true,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        }
    };

    const handleSuggestionClick = (suggestion) => {
        setInput(suggestion);
        inputRef.current?.focus();
    };

    const quickExamples = [
        'Find 5 engineers at Stripe',
        'Show me executives at Google',
        'Get marketing team at HubSpot',
        'Find contacts at Microsoft'
    ];

    return (
        <div className="chat-search-container">
            <div className="chat-messages">
                {messages.map((message, index) => (
                    <div key={index} className={`message message-${message.type}`}>
                        {message.type === 'suggestions' ? (
                            <div className="suggestion-chips">
                                {message.suggestions.map((suggestion, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleSuggestionClick(suggestion)}
                                        className="suggestion-chip"
                                        disabled={isSearching}
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <>
                                <div className="message-content">
                                    {message.text}
                                    {message.isThinking && (
                                        <span className="thinking-dots">
                                            <span>.</span>
                                            <span>.</span>
                                            <span>.</span>
                                        </span>
                                    )}
                                </div>
                                {message.parsedCriteria && (
                                    <div className="parsed-info">
                                        <strong>Understood:</strong>
                                        <ul>
                                            <li>Company: {message.parsedCriteria.company}</li>
                                            {message.parsedCriteria.count && <li>Count: {message.parsedCriteria.count}</li>}
                                            {message.parsedCriteria.role && <li>Role: {message.parsedCriteria.role}</li>}
                                            {message.parsedCriteria.department && <li>Department: {message.parsedCriteria.department}</li>}
                                            {message.parsedCriteria.seniority && <li>Seniority: {message.parsedCriteria.seniority}</li>}
                                        </ul>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="chat-input-form">
                <div className="quick-examples">
                    {quickExamples.map((example, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => handleSuggestionClick(example)}
                            className="example-chip"
                            disabled={isSearching}
                        >
                            {example}
                        </button>
                    ))}
                </div>
                
                <div className="input-wrapper">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask me to find contacts... (e.g., 'Find 10 engineers at Google')"
                        className="chat-input"
                        disabled={isSearching}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isSearching}
                        className="send-button"
                    >
                        {isSearching ? '⏳' : '🔍'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ChatSearch;
