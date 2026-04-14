// src/components/FormInput.jsx
import React from 'react';

function FormInput({ 
  id, 
  name, 
  label, 
  type = 'text', 
  value, 
  onChange, 
  required = false,
  placeholder = '',
  autoComplete = '',
  error = '',
  ...props 
}) {
  return (
    <div className="mb-4">
      <label 
        htmlFor={id} 
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        id={id}
        name={name || id}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`
          w-full px-3 py-2 border rounded-md 
          focus:outline-none focus:ring-2 focus:ring-blue-500
          ${error ? 'border-red-500' : 'border-gray-300'}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

export default FormInput;