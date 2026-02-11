'use client';

interface CheckoutStepperProps {
  currentStep: number;
  steps?: string[];
}

const DEFAULT_STEPS = ['Sepet', 'Müşteri', 'Ödeme', 'Onay'];

export default function CheckoutStepper({
  currentStep,
  steps = DEFAULT_STEPS,
}: CheckoutStepperProps) {
  const activeStep = Math.min(Math.max(currentStep, 0), steps.length - 1);

  return (
    <nav
      aria-label="Checkout steps"
      className="rounded-[var(--radius-2xl)] border border-[var(--neutral-200)] bg-white px-4 py-4 md:px-6"
    >
      <ol className="flex flex-col gap-4 md:flex-row md:items-center">
        {steps.map((step, index) => {
          const isCompleted = index < activeStep;
          const isCurrent = index === activeStep;
          const circleStyles = isCompleted
            ? 'border-[var(--primary-800)] bg-[var(--primary-800)] text-white'
            : isCurrent
              ? 'border-[var(--primary-800)] text-[var(--primary-800)]'
              : 'border-[var(--neutral-200)] text-[var(--neutral-500)]';
          const labelStyles = isCurrent
            ? 'text-[var(--primary-800)]'
            : isCompleted
              ? 'text-[var(--primary-800)]/80'
              : 'text-[var(--neutral-500)]';
          const connectorStyles = isCompleted
            ? 'bg-[var(--primary-800)]'
            : 'bg-[var(--neutral-200)]';

          return (
            <li
              key={step}
              className="flex flex-1 items-center gap-3"
              aria-current={isCurrent ? 'step' : undefined}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold ${circleStyles}`}
              >
                {isCompleted ? '✓' : index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
                  Adım {index + 1}
                </p>
                <p className={`text-sm font-semibold ${labelStyles}`}>{step}</p>
              </div>
              {index < steps.length - 1 && (
                <span
                  className={`hidden h-[2px] flex-1 rounded-full md:block ${connectorStyles}`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
