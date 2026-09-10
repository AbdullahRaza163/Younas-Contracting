// src/components/AIAssistant.jsx

import React, { useState, useEffect, useRef } from 'react';
import useAI from '../hooks/useAI';
import Utils from '../utils/Utils';
import './AIAssistant.css';

const AIAssistantComponent = ({ data }) => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Assalam o Alaikum! I\'m your AI assistant for Haji Younas Contracting. How can I help you today? 🏗️' }
  ]);
  const [input, setInput] = useState('');
  const { sendMessage, loading } = useAI();
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      const context = {
        sites: data.sites,
        workers: data.workers,
        entries: data.entries.slice(-50),
        attendance: data.attendance,
        monthlyOverhead: data.monthlyOverhead,
        summary: {
          totalKamai: Utils.calculateTotal(data.entries, 'kamai'),
          totalLabour: Utils.calculateTotal(data.entries, 'labour'),
          totalOH: Utils.calculateTotal(data.entries, 'overhead'),
          totalOT: Utils.calculateTotal(data.entries, 'oneTime'),
          netProfit: Utils.calculateTotal(data.entries, 'kamai') -
            Utils.calculateTotal(data.entries, 'labour') -
            Utils.calculateTotal(data.entries, 'overhead') -
            Utils.calculateTotal(data.entries, 'oneTime')
        }
      };

      const reply = await sendMessage(userMessage, context);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again later. 🔧'
      }]);
    }
  };

  const quickQuestions = [
    "What's today's profit?",
    "Show site performance summary",
    "Calculate total worker wages today",
    "Who is working today?",
    "Give me business recommendations"
  ];

  return (
    <div className="ai-assistant-modern">
      <div className="ai-header-modern">
        <h2>AI Assistant</h2>
        <span className="ai-status">{loading ? '🔄 Thinking...' : '✅ Online'}</span>
      </div>

      <div className="messages-container-modern">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.role}`}>
            <div className="message-avatar">
              {msg.role === 'assistant' ? '🏗️' : '👤'}
            </div>
            <div className="message-content">
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="message assistant">
            <div className="message-avatar">🏗️</div>
            <div className="message-content typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {messages.length === 1 && (
        <div className="quick-questions-modern">
          {quickQuestions.map((q, i) => (
            <button key={i} className="quick-btn-modern" onClick={() => {
              setInput(q);
              setTimeout(handleSend, 100);
            }}>
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="input-area-modern">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask me anything about your business..."
          rows={1}
          disabled={loading}
        />
        <button
          className={`send-btn-modern ${loading || !input.trim() ? 'disabled' : ''}`}
          onClick={handleSend}
          disabled={loading || !input.trim()}
        >
          {loading ? '⏳' : '➤'}
        </button>
      </div>
    </div>
  );
};

export default AIAssistantComponent;