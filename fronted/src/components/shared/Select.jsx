import './Select.css';

const Select = ({
  label,
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Seleccionar...',
  error,
  required = false,
  disabled = false,
  ...props
}) => {
  const hasExplicitEmptyOption = options.some((option) => option.value === '');

  return (
    <div className="select-group">
      {label && (
        <label htmlFor={name} className="select-group__label">
          {label}
          {required && <span className="select-group__required">*</span>}
        </label>
      )}
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        className={`select-group__select ${error ? 'select-group__select--error' : ''}`}
        {...props}
      >
        {placeholder && !hasExplicitEmptyOption && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      {error && <span className="select-group__error">{error}</span>}
    </div>
  );
};

export default Select;
