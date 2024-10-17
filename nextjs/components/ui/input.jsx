import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef(({ className, type, label, ...props }, ref) => {
  return (
    <div className="relative">
      <input
        type={type}
        id="floating_outlined"
        className={cn(
          "block px-2.5 pb-2.5 pt-4 w-full text-sm text-gray-900 bg-transparent rounded-lg border border-gray-300 appearance-none  duration-200 ease-in-out focus:outline-none focus:ring-0 focus:border-blue-600 peer autofill:bg-white autofill:shadow-inset autofill:text-fill-color transition peer-focus:bg-white dark:text-white dark:border-gray-600 dark:focus:border-blue-500 dark:autofill:bg-gray-900", // Added autofill styles
          className,
        )}
        placeholder=" "
        ref={ref}
        {...props}
      />
      <label
        htmlFor="floating_outlined"
        className={cn(
          "absolute mx-1 text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white px-2 peer-focus:px-2 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 dark:bg-gray-900", // Adjusted background for light and dark modes
          "autofill:label:bg-white dark:autofill:label:bg-gray-900", // Added autofill styles to label
        )}
      >
        {label}
      </label>
    </div>
  );
});

Input.displayName = "Input";

export { Input };
