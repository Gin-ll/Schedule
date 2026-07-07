// Custom Select Component
class CustomSelect {
  constructor(originalSelect) {
    this.originalSelect = originalSelect;
    this.customSelect = document.createElement('div');
    this.customSelect.classList.add('custom-select');
    
    this.selectedDiv = document.createElement('div');
    this.selectedDiv.classList.add('select-selected');
    
    // Wrap the original select label content or use placeholder
    const labelText = originalSelect.parentElement.childNodes[0].textContent.trim();
    if (labelText) {
      this.selectedDiv.innerHTML = `<span class="select-label">${labelText}</span><span class="select-value">${originalSelect.options[originalSelect.selectedIndex]?.text}</span><svg class="select-arrow" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
    } else {
      this.selectedDiv.innerHTML = `<span class="select-value">${originalSelect.options[originalSelect.selectedIndex]?.text}</span><svg class="select-arrow" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
    }

    this.optionsDiv = document.createElement('div');
    this.optionsDiv.classList.add('select-items', 'select-hide');
    
    this.setupOptions();
    
    this.customSelect.appendChild(this.selectedDiv);
    this.customSelect.appendChild(this.optionsDiv);
    
    // Hide original select and label text
    originalSelect.style.display = 'none';
    if (originalSelect.parentElement.tagName === 'LABEL') {
      originalSelect.parentElement.childNodes[0].textContent = '';
      originalSelect.parentElement.appendChild(this.customSelect);
    } else {
      originalSelect.parentNode.insertBefore(this.customSelect, originalSelect.nextSibling);
    }

    this.selectedDiv.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeAllSelect(this);
      this.optionsDiv.classList.toggle('select-hide');
      this.selectedDiv.classList.toggle('select-arrow-active');
    });
  }

  setupOptions() {
    this.optionsDiv.innerHTML = '';
    for (let i = 0; i < this.originalSelect.length; i++) {
      const optionItem = document.createElement('div');
      optionItem.innerHTML = this.originalSelect.options[i].innerHTML;
      if (this.originalSelect.selectedIndex === i) {
        optionItem.classList.add('same-as-selected');
      }
      optionItem.addEventListener('click', (e) => {
        this.originalSelect.selectedIndex = i;
        this.selectedDiv.querySelector('.select-value').innerHTML = this.originalSelect.options[i].innerHTML;
        
        const y = this.optionsDiv.getElementsByClassName('same-as-selected');
        for (let k = 0; k < y.length; k++) {
          y[k].classList.remove('same-as-selected');
        }
        optionItem.classList.add('same-as-selected');
        this.selectedDiv.click();
        
        // Trigger change event on original select
        const event = new Event('change', { bubbles: true });
        this.originalSelect.dispatchEvent(event);
      });
      this.optionsDiv.appendChild(optionItem);
    }
  }

  closeAllSelect(exceptThis) {
    const x = document.getElementsByClassName('select-items');
    const y = document.getElementsByClassName('select-selected');
    for (let i = 0; i < y.length; i++) {
      if (exceptThis !== y[i]?.parentElement?.parentElement?.customSelectInstance) {
        y[i].classList.remove('select-arrow-active');
      }
    }
    for (let i = 0; i < x.length; i++) {
      if (exceptThis !== x[i]?.parentElement?.customSelectInstance) {
        x[i].classList.add('select-hide');
      }
    }
  }
}

document.addEventListener('click', () => {
  const x = document.getElementsByClassName('select-items');
  const y = document.getElementsByClassName('select-selected');
  for (let i = 0; i < y.length; i++) {
    y[i].classList.remove('select-arrow-active');
  }
  for (let i = 0; i < x.length; i++) {
    x[i].classList.add('select-hide');
  }
});
