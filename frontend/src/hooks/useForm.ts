/**
 * Form state management hook
 */

import { useState, useCallback } from 'react';
import type { FormState, FormError } from '@/types';

export interface UseFormOptions<T> {
  initialValues: T;
  onSubmit: (values: T) => Promise<void>;
  validate?: (values: T) => FormError[];
}

export function useForm<T extends Record<string, any>>(options: UseFormOptions<T>) {
  const { initialValues, onSubmit, validate } = options;

  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FormError[]>([]);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getFieldError = useCallback(
    (fieldName: string): string | undefined => {
      return errors.find((error) => error.field === fieldName)?.message;
    },
    [errors],
  );

  const setFieldValue = useCallback((field: string, value: any) => {
    setValues((prev) => ({
      ...prev,
      [field]: value,
    }));
    setIsDirty(true);

    // Clear error for this field
    setErrors((prev) => prev.filter((error) => error.field !== field));
  }, []);

  const setFieldError = useCallback((field: string, message: string) => {
    setErrors((prev) => {
      // Remove existing error for this field
      const filtered = prev.filter((error) => error.field !== field);
      return [...filtered, { field, message }];
    });
  }, []);

  const setFieldTouched = useCallback((field: string, touched: boolean) => {
    setTouched((prev) => ({
      ...prev,
      [field]: touched,
    }));
  }, []);

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors([]);
    setTouched({});
    setIsDirty(false);
    setIsSubmitting(false);
  }, [initialValues]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      // Run validation if provided
      if (validate) {
        const validationErrors = validate(values);
        if (validationErrors.length > 0) {
          setErrors(validationErrors);
          return;
        }
      }

      setIsSubmitting(true);

      try {
        await onSubmit(values);
        // Reset form after successful submission
        resetForm();
      } catch (error) {
        // Error is handled by caller
        console.error('Form submission error:', error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, validate, onSubmit, resetForm],
  );

  const isValid = errors.length === 0;

  return {
    values,
    errors,
    touched,
    isDirty,
    isValid,
    isSubmitting,
    setFieldValue,
    setFieldError,
    setFieldTouched,
    getFieldError,
    resetForm,
    handleSubmit,
  };
}
