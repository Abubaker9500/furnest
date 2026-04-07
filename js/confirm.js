function showConfirm(message, confirmLabel = 'Delete') {
  return new Promise(resolve => {
    let overlay = document.getElementById('fn-confirm-overlay');
    if (!overlay) {
      document.body.insertAdjacentHTML('beforeend', `
        <div id="fn-confirm-overlay" class="modal-overlay" style="display:none">
          <div class="modal-box fn-confirm-box">
            <p id="fn-confirm-msg" class="fn-confirm-msg"></p>
            <div class="modal-actions">
              <button class="btn-danger" id="fn-confirm-ok"></button>
              <button class="btn-cancel" id="fn-confirm-cancel">Cancel</button>
            </div>
          </div>
        </div>`);
      overlay = document.getElementById('fn-confirm-overlay');
    }

    document.getElementById('fn-confirm-msg').textContent = message;
    const okBtn = document.getElementById('fn-confirm-ok');
    okBtn.textContent = confirmLabel;
    overlay.style.display = 'flex';

    const ac = new AbortController();
    const { signal } = ac;

    function close(result) {
      overlay.style.display = 'none';
      ac.abort();
      resolve(result);
    }

    okBtn.addEventListener('click', () => close(true), { signal });
    document.getElementById('fn-confirm-cancel').addEventListener('click', () => close(false), { signal });
    overlay.addEventListener('click', e => { if (e.target === overlay) close(false); }, { signal });
  });
}

export { showConfirm };
