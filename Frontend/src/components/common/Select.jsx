import { useState, useRef, useEffect } from 'react';
import styles from './Select.module.css';

const Select = ({ id, name, options = [], value, onChange, placeholder = 'Select an option...', 'aria-label': ariaLabel }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue) => {
    // Mimic the native event object so `onChange` handlers don't need rewriting
    if (onChange) {
      onChange({ target: { name, value: optionValue } });
    }
    setIsOpen(false);
  };

  const selectedOption = options.find(o => (typeof o === 'string' ? o : o.value) === value);
  const displayValue = selectedOption ? (typeof selectedOption === 'string' ? selectedOption : selectedOption.label) : placeholder;

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        type="button"
        id={id}
        name={name}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`${styles.trigger} ${isOpen ? styles.triggerActive : ''} ${!value ? styles.triggerPlaceholder : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={styles.displayValue}>{displayValue}</span>
        <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 4 6 7 9 4" />
          </svg>
        </span>
      </button>

      {/* Hidden native input to ensure form submissions still capture the value if uncontrolled */}
      <input type="hidden" name={name} value={value || ''} />

      {isOpen && (
        <ul className={styles.dropdown} role="listbox">
          {options.map((opt, i) => {
            const optVal = typeof opt === 'string' ? opt : opt.value;
            const optLabel = typeof opt === 'string' ? opt : opt.label;
            const isSelected = value === optVal;

            return (
              <li
                key={`${optVal}-${i}`}
                role="option"
                aria-selected={isSelected}
                className={`${styles.option} ${isSelected ? styles.optionSelected : ''}`}
                onClick={() => handleSelect(optVal)}
              >
                {optLabel}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default Select;
