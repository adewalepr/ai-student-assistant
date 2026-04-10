const API = "http://localhost:5000";

// Chat - Enhanced with loading spinner & error handling
async function sendMessage() {
  const input = document.getElementById("chatInput");
  const message = input.value.trim();
  if (!message) {
    input.focus();
    return;
  }
  
  const output = document.getElementById("chatResponse");
  output.innerHTML = '<div class="loading"><div class="spinner"></div>AI is thinking<span style="opacity:0.7;">...</span></div>';

  input.value = '';
  input.placeholder = 'Ask another question...';

  try {
    const res = await fetch(API + "/chat", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ message }),
    });

    if (!res.ok) throw new Error('Server error');

    const data = await res.json();
    output.textContent = data.reply || 'No response from AI.';
  } catch (error) {
    output.innerHTML = '<i class="fas fa-exclamation-triangle" style="color:#ef4444;"></i> Connection error. <br><small>Make sure server is running on port 5000.</small>';
  }
}

// Summarizer - Enhanced
async function summarize() {
  const textarea = document.getElementById("notes");
  const text = textarea.value.trim();
  if (!text) {
    textarea.focus();
    return;
  }
  
  const output = document.getElementById("summary");
  output.innerHTML = '<div class="loading"><div class="spinner"></div>Creating summary<span style="opacity:0.7;">...</span></div>';

  try {
    const res = await fetch(API + "/summarize", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ text }),
    });

    if (!res.ok) throw new Error('Server error');

    const data = await res.json();
    output.textContent = data.summary || 'Summary could not be generated.';
  } catch (error) {
    output.innerHTML = '<i class="fas fa-exclamation-triangle" style="color:#ef4444;"></i> Summarization failed. <br><small>Check your notes and server connection.</small>';
  }
}

// Reminder - Improved with validation & notifications
function setReminder() {
  const taskInput = document.getElementById("task");
  const timeInput = document.getElementById("time");
  const task = taskInput.value.trim();
  const time = timeInput.value;

  if (!task || !time) {
    alert('⚠️ Please fill in both task and time.');
    return;
  }

  const now = new Date();
  const [hours, minutes] = time.split(':').map(Number);
  const target = new Date();
  target.setHours(hours, minutes, 0, 0);

  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }

  const delay = target.getTime() - now.getTime();

  setTimeout(() => {
    // Try Notification API first, fallback to alert
    if (Notification.permission === 'granted') {
      new Notification('🔔 Study Reminder', { 
        body: task,
        icon: '/favicon.ico' 
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(() => {
        new Notification('🔔 Study Reminder', { body: task });
      });
    } else {
      alert('🔔 Reminder: ' + task);
    }
  }, delay);

  taskInput.value = '';
  timeInput.value = '';
  alert(`✅ Reminder set for ${time}!\n"${task}"`);
  
  // Focus back to task for quick next reminder
  taskInput.focus();
}
