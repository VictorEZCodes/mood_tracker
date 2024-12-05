import MoodTracker from './main.js';

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  const app = new MoodTracker();

  // Set initial theme
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  document.getElementById('darkModeToggle').textContent = savedTheme === 'dark' ? '☀️' : '🌙';
});