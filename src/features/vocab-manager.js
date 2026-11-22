import { state } from '../state/store.js';
import { escapeHTML } from '../utils/escape.js';
import { getCustomVocabList, saveCustomVocabList } from '../services/storage.js';
import { refreshVocabList, updateGameStartMeta } from './catalog.js';

export function setupVocabAddForm() {
  const addForm = document.getElementById('vocab-add-form');
  if (!addForm) return;

  addForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const word = document.getElementById('vocab-word').value.trim();
    const meaning = document.getElementById('vocab-meaning').value.trim();
    const image = document.getElementById('vocab-image').value.trim();
    const explanation = document.getElementById('vocab-explanation').value.trim();

    if (!word || !meaning || !image || !explanation) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วนทุกช่องด้วยนะจ๊ะ');
      return;
    }

    const exists = state.VOCAB_LIST.some(item => item.word.toLowerCase() === word.toLowerCase());
    if (exists) {
      alert('คำศัพท์นี้มีอยู่ในคลังแล้วจ้า ลองเพิ่มคำอื่นนะ');
      return;
    }

    const newVocab = { word, meaning, image, explanation };
    const list = getCustomVocabList();
    list.push(newVocab);
    saveCustomVocabList(list);

    addForm.reset();
    alert('บันทึกคำศัพท์ใหม่เรียบร้อยแล้วจ้า! สามารถไปทบทวนในโหมดฝึกสะกดคำได้เลย');

    refreshVocabList();
    renderCustomVocabTable();
    updateGameStartMeta();
  });
}

export function renderCustomVocabTable() {
  const tbody = document.getElementById('custom-vocab-list-tbody');
  const emptyDiv = document.getElementById('custom-vocab-empty');
  if (!tbody) return;

  tbody.innerHTML = '';
  const custom = getCustomVocabList();

  if (custom.length === 0) {
    if (emptyDiv) emptyDiv.style.display = 'block';
    return;
  }

  if (emptyDiv) emptyDiv.style.display = 'none';

  custom.forEach((item, idx) => {
    const tr = document.createElement('tr');
    tr.style.height = '50px';

    const imgHtml = item.image.startsWith('<svg') ? item.image : `<span style="font-size:1.5rem;">${item.image}</span>`;

    tr.innerHTML = `
      <td data-label="ภาพ" style="padding: 10px; width: 60px;">${imgHtml}</td>
      <td data-label="อังกฤษ" style="padding: 10px; font-weight:700; color:var(--dark-2);">${escapeHTML(item.word)}</td>
      <td data-label="แปลไทย" style="padding: 10px; color:var(--text-muted);">${escapeHTML(item.meaning)}</td>
      <td data-label="จัดการ" style="padding: 10px; text-align: center;">
        <button class="btn-delete-vocab" onclick="deleteCustomVocab(${idx})">ลบ</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

export function deleteCustomVocab(idx) {
  if (confirm('คุณพ่อคุณแม่ต้องการลบคำศัพท์นี้ออกจากคลังใช่หรือไม่จ๊ะ?')) {
    const custom = getCustomVocabList();
    custom.splice(idx, 1);
    saveCustomVocabList(custom);
    refreshVocabList();
    renderCustomVocabTable();
    updateGameStartMeta();
  }
}
