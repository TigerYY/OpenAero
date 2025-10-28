'use client';

import { useState, useEffect } from 'react';
import { InputSanitizer } from '../lib/security';

interface PasswordStrengthIndicatorProps {
  password: string;
  onValidationChange?: (isValid: boolean, score: number) => void;
  showRequirements?: boolean;
  className?: string;
}

interface PasswordRequirement {
  id: string;
  label: string;
  test: (password: string) => boolean;
  met: boolean;
}

export default function PasswordStrengthIndicator({
  password,
  onValidationChange,
  showRequirements = true,
  className = ''
}: PasswordStrengthIndicatorProps) {
  const [validation, setValidation] = useState({
    isValid: false,
    score: 0,
    feedback: [] as string[]
  });

  const [requirements, setRequirements] = useState<PasswordRequirement[]>([
    {
      id: 'length',
      label: '至少8个字符',
      test: (pwd) => pwd.length >= 8,
      met: false
    },
    {
      id: 'lowercase',
      label: '包含小写字母',
      test: (pwd) => /[a-z]/.test(pwd),
      met: false
    },
    {
      id: 'uppercase',
      label: '包含大写字母',
      test: (pwd) => /[A-Z]/.test(pwd),
      met: false
    },
    {
      id: 'number',
      label: '包含数字',
      test: (pwd) => /\d/.test(pwd),
      met: false
    },
    {
      id: 'special',
      label: '包含特殊字符 (!@#$%^&*)',
      test: (pwd) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
      met: false
    }
  ]);

  useEffect(() => {
    const newValidation = InputSanitizer.validatePassword(password);
    setValidation(newValidation);

    // 更新需求状态
    const updatedRequirements = requirements.map(req => ({
      ...req,
      met: req.test(password)
    }));
    setRequirements(updatedRequirements);

    // 通知父组件验证状态变化
    if (onValidationChange) {
      onValidationChange(newValidation.isValid, newValidation.score);
    }
  }, [password, onValidationChange]);

  const getStrengthColor = (score: number) => {
    if (score === 0) return 'bg-gray-200';
    if (score <= 2) return 'bg-red-500';
    if (score <= 3) return 'bg-yellow-500';
    if (score <= 4) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getStrengthText = (score: number) => {
    if (score === 0) return '请输入密码';
    if (score <= 2) return '弱';
    if (score <= 3) return '中等';
    if (score <= 4) return '强';
    return '很强';
  };

  const getStrengthTextColor = (score: number) => {
    if (score === 0) return 'text-gray-500';
    if (score <= 2) return 'text-red-600';
    if (score <= 3) return 'text-yellow-600';
    if (score <= 4) return 'text-blue-600';
    return 'text-green-600';
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 密码强度条 */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">密码强度</span>
          <span className={`text-sm font-medium ${getStrengthTextColor(validation.score)}`}>
            {getStrengthText(validation.score)}
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor(validation.score)}`}
            style={{ width: `${(validation.score / 5) * 100}%` }}
          />
        </div>
      </div>

      {/* 密码要求列表 */}
      {showRequirements && password.length > 0 && (
        <div className="space-y-2">
          <span className="text-sm text-gray-600">密码要求：</span>
          <ul className="space-y-1">
            {requirements.map((req) => (
              <li key={req.id} className="flex items-center space-x-2 text-sm">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                  req.met ? 'bg-green-500' : 'bg-gray-300'
                }`}>
                  {req.met && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <span className={req.met ? 'text-green-600' : 'text-gray-500'}>
                  {req.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 安全提示 */}
      {validation.score >= 4 && (
        <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="text-sm text-green-700">密码强度良好！</span>
        </div>
      )}

      {validation.score > 0 && validation.score < 3 && (
        <div className="flex items-center space-x-2 p-3 bg-yellow-50 rounded-lg">
          <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="text-sm text-yellow-700">建议使用更强的密码以提高安全性</span>
        </div>
      )}
    </div>
  );
}