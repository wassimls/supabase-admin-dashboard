
import React, { useEffect, useState } from 'react';
import { CheckCircleIcon, ExclamationCircleIcon, XMarkIcon } from './Icons';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onDismiss: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animate in
    setIsVisible(true);
    
    // Set timer to animate out and then dismiss
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onDismiss, 300); // Wait for animation to finish
    }, 4000);

    return () => clearTimeout(timer);
  }, [onDismiss]);
  
  const isSuccess = type === 'success';
  const bgColor = isSuccess ? 'bg-green-500' : 'bg-red-500';
  const Icon = isSuccess ? CheckCircleIcon : ExclamationCircleIcon;

  return (
    <div
      className={`fixed bottom-5 right-5 z-50 flex items-center p-4 rounded-lg shadow-lg text-white ${bgColor} transition-all duration-300 ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}
      role="alert"
    >
      <div className="flex-shrink-0">
        <Icon className="w-6 h-6" />
      </div>
      <div className="ml-3 mr-8 text-sm font-medium">
        {message}
      </div>
       <button onClick={onDismiss} className="absolute top-1 right-1 p-1.5 rounded-full hover:bg-black/20">
        <XMarkIcon className="w-4 h-4"/>
      </button>
    </div>
  );
};

export default Toast;
