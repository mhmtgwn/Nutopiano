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
      className="rounded-2xl border border-[#E5E5E0] bg-white px-4 py-4 md:px-6"
    >
      <ol className="flex flex-col gap-4 md:flex-row md:items-center">
        {steps.map((step, index) => {
          const isCompleted = index < activeStep;
          const isCurrent = index === activeStep;
          const circleStyles = isCompleted
            ? 'border-[#1A3C34] bg-[#1A3C34] text-white'
            : isCurrent
              ? 'border-[#1A3C34] text-[#1A3C34]'
              : 'border-[#E5E5E0] text-[#8A8A8A]';
          const labelStyles = isCurrent
            ? 'text-[#1A3C34]'
            : isCompleted
              ? 'text-[#1A3C34]/80'
              : 'text-[#8A8A8A]';
          const connectorStyles = isCompleted ? 'bg-[#1A3C34]' : 'bg-[#E5E5E0]';

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
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A8A8A]">
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
