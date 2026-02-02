document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('clickBtn');
  const timeEl = document.getElementById('time');

  btn.addEventListener('click', () => {
    const now = new Date();
    timeEl.textContent = `Clicked at ${now.toLocaleTimeString()}`;
    alert('Button clicked!');
  });
});