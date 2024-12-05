class MoodTracker {
  constructor() {
    this.moodData = JSON.parse(localStorage.getItem('moodData')) || [];
    this.customEmojis = JSON.parse(localStorage.getItem('customEmojis')) || [];
    this.selectedMood = null;
    this.chart = null;
    this.init();
  }

  init() {
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('entryDate').value = today;
    document.getElementById('entryDate').max = today;

    // Initialize event listeners
    this.initializeEventListeners();

    // Initial render
    this.renderMoodHistory();
    this.renderMoodChart();
    this.updateEmojiButtons();
  }

  showPopup(message, showCancel = false) {
    return new Promise((resolve) => {
      const popup = document.getElementById('popup');
      const messageEl = document.getElementById('popup-message');
      const confirmBtn = document.getElementById('popup-confirm');
      const cancelBtn = document.getElementById('popup-cancel');

      messageEl.textContent = message;
      popup.classList.add('show');

      // Show/hide cancel button based on parameter
      cancelBtn.style.display = showCancel ? 'inline-block' : 'none';

      const closePopup = (result) => {
        popup.classList.remove('show');
        resolve(result);
      };

      confirmBtn.onclick = () => closePopup(true);
      cancelBtn.onclick = () => closePopup(false);
    });
  }

  initializeEventListeners() {
    // Save mood entry
    const saveButton = document.getElementById('saveMood');
    const newSaveButton = saveButton.cloneNode(true);
    saveButton.parentNode.replaceChild(newSaveButton, saveButton);

    newSaveButton.addEventListener('click', async () => {
      console.log('Save button clicked, selectedMood:', this.selectedMood);
      if (!this.selectedMood) {
        await this.showPopup('Please select a mood!');
        return;
      }
      this.saveMoodEntry();
    });

    // Dark mode toggle
    const darkModeButton = document.getElementById('darkModeToggle');
    const newDarkModeButton = darkModeButton.cloneNode(true);
    darkModeButton.parentNode.replaceChild(newDarkModeButton, darkModeButton);
    newDarkModeButton.addEventListener('click', () => this.toggleDarkMode());

    // Export data - Fix duplicate listeners
    const exportButton = document.getElementById('exportData');
    const newExportButton = exportButton.cloneNode(true);
    exportButton.parentNode.replaceChild(newExportButton, exportButton);
    newExportButton.addEventListener('click', () => this.exportMoodData());

    // Add custom emoji
    const addEmojiButton = document.getElementById('addCustomEmoji');
    const newAddEmojiButton = addEmojiButton.cloneNode(true);
    addEmojiButton.parentNode.replaceChild(newAddEmojiButton, addEmojiButton);
    newAddEmojiButton.addEventListener('click', () => this.addCustomEmoji());

    // Add emoji button listeners
    this.addEmojiButtonListeners();
  }

  addEmojiButtonListeners() {
    document.querySelectorAll('.emoji-buttons button').forEach(button => {
      const newButton = button.cloneNode(true);
      button.parentNode.replaceChild(newButton, button);

      newButton.addEventListener('click', () => {
        // Clear previous selections
        document.querySelectorAll('.emoji-buttons button').forEach(btn =>
          btn.style.backgroundColor = '');

        // Set new selection
        this.selectedMood = newButton.dataset.mood;
        newButton.style.backgroundColor = '#f0f0f0';

        console.log('Selected mood after click:', this.selectedMood);
      });
    });
  }

  saveMoodEntry() {
    const note = document.getElementById('moodNote').value;
    const date = document.getElementById('entryDate').value;

    const entry = {
      mood: this.selectedMood,
      note: note,
      date: new Date(date).toISOString()
    };

    this.moodData = this.moodData.filter(item =>
      new Date(item.date).toDateString() !== new Date(date).toDateString()
    );

    this.moodData.unshift(entry);
    localStorage.setItem('moodData', JSON.stringify(this.moodData));

    // Reset form
    this.selectedMood = null;
    document.getElementById('moodNote').value = '';
    document.querySelectorAll('.emoji-buttons button').forEach(btn =>
      btn.style.backgroundColor = '');

    this.renderMoodHistory();
    this.renderMoodChart();
  }

  renderMoodHistory() {
    const moodList = document.getElementById('moodList');
    moodList.innerHTML = this.moodData.map((entry, index) => {
      const date = new Date(entry.date).toLocaleDateString();
      const emoji = this.getMoodEmoji(entry.mood);
      return `
        <div class="mood-entry">
          <div class="mood-entry-header">
            <div class="mood-entry-content">
              <strong>${date}</strong> ${emoji}
              <p>${entry.note}</p>
            </div>
            <button class="delete-btn" data-index="${index}">❌</button>
          </div>
        </div>
      `;
    }).join('');

    document.querySelectorAll('.delete-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.deleteMoodEntry(index);
      });
    });
  }

  async deleteMoodEntry(index) {
    const confirmed = await this.showPopup('Are you sure you want to delete this mood entry?', true);
    if (confirmed) {
      this.moodData.splice(index, 1);
      localStorage.setItem('moodData', JSON.stringify(this.moodData));
      this.renderMoodHistory();
      this.renderMoodChart();
    }
  }

  renderMoodChart() {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }

    const chartContainer = document.getElementById('moodChart').parentElement;
    chartContainer.innerHTML = '<canvas id="moodChart"></canvas>';

    const ctx = document.getElementById('moodChart').getContext('2d');

    const moodCounts = {
      great: 0,
      good: 0,
      okay: 0,
      bad: 0,
      awful: 0,
      ...Object.fromEntries(this.customEmojis.map(emoji => [`custom_${emoji}`, 0]))
    };

    this.moodData.forEach(entry => {
      if (entry.mood in moodCounts) {
        moodCounts[entry.mood]++;
      }
    });

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: Object.keys(moodCounts).map(mood => this.getMoodEmoji(mood)),
        datasets: [{
          label: 'Mood Distribution',
          data: Object.values(moodCounts),
          backgroundColor: [
            '#4CAF50', '#8BC34A', '#FFC107', '#FF9800', '#F44336',
            ...Array(this.customEmojis.length).fill('#9C27B0')
          ]
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#fff' : '#666'
            },
            grid: {
              color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#444' : '#ddd'
            }
          },
          x: {
            ticks: {
              color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#fff' : '#666'
            },
            grid: {
              color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#444' : '#ddd'
            }
          }
        },
        plugins: {
          legend: {
            labels: {
              color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#fff' : '#666'
            }
          }
        }
      }
    });
  }

  exportMoodData() {
    // Ensure we're getting the latest data from localStorage
    this.moodData = JSON.parse(localStorage.getItem('moodData')) || [];

    // Format the data to be more readable
    const formattedData = this.moodData.map(entry => ({
      date: new Date(entry.date).toLocaleDateString(),
      mood: this.getMoodEmoji(entry.mood),
      note: entry.note,
      // Keep the original data for compatibility
      rawMood: entry.mood,
      rawDate: entry.date
    }));

    const dataStr = JSON.stringify(formattedData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mood-tracker-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async addCustomEmoji() {
    const customEmoji = document.getElementById('customEmoji').value.trim();
    if (customEmoji) {
      if (this.customEmojis.includes(customEmoji)) {
        await this.showPopup('This emoji is already added!');
        return;
      }
      this.customEmojis.push(customEmoji);
      localStorage.setItem('customEmojis', JSON.stringify(this.customEmojis));

      // Reset the selected mood when adding new emoji
      this.selectedMood = null;

      this.updateEmojiButtons();
      document.getElementById('customEmoji').value = '';
      console.log('Custom emoji added, selectedMood reset:', this.selectedMood);
    }
  }

  updateEmojiButtons() {
    const emojiContainer = document.querySelector('.emoji-buttons');
    const standardEmojis = `
      <button data-mood="great">😊</button>
      <button data-mood="good">🙂</button>
      <button data-mood="okay">😐</button>
      <button data-mood="bad">😕</button>
      <button data-mood="awful">😢</button>
    `;

    const customEmojiButtons = this.customEmojis.map(emoji => `
      <div class="custom-emoji-container">
        <button data-mood="custom_${emoji}">${emoji}</button>
        <span class="remove-emoji" data-emoji="${emoji}">×</span>
      </div>
    `).join('');

    emojiContainer.innerHTML = standardEmojis + customEmojiButtons;

    // Add mood selection listeners
    this.addEmojiButtonListeners();

    // Add remove button listeners
    document.querySelectorAll('.remove-emoji').forEach(removeBtn => {
      removeBtn.addEventListener('click', (e) => {
        const emojiToRemove = e.target.dataset.emoji;
        this.removeCustomEmoji(emojiToRemove);
      });
    });
  }

  async removeCustomEmoji(emoji) {
    const confirmed = await this.showPopup(`Remove ${emoji} from custom emojis?`, true);
    if (confirmed) {
      this.customEmojis = this.customEmojis.filter(e => e !== emoji);
      localStorage.setItem('customEmojis', JSON.stringify(this.customEmojis));

      // If the removed emoji was selected, reset selection
      if (this.selectedMood === `custom_${emoji}`) {
        this.selectedMood = null;
      }

      this.updateEmojiButtons();
      this.renderMoodChart();
    }
  }

  toggleDarkMode() {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    html.setAttribute('data-theme', isDark ? 'light' : 'dark');
    document.getElementById('darkModeToggle').textContent = isDark ? '🌙' : '☀️';
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
    this.renderMoodChart();
  }

  getMoodEmoji(mood) {
    const emojis = {
      great: '😊',
      good: '🙂',
      okay: '😐',
      bad: '😕',
      awful: '😢'
    };

    if (mood && mood.startsWith('custom_')) {
      return mood.replace('custom_', '');
    }

    return emojis[mood] || '❓';
  }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  const app = new MoodTracker();

  // Set initial theme
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  document.getElementById('darkModeToggle').textContent = savedTheme === 'dark' ? '☀️' : '🌙';
});

export default MoodTracker;