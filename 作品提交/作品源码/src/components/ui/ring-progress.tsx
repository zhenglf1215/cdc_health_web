'use client';

import { useEffect, useState } from 'react';

interface RingProgressProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  showLabel?: boolean;
  children?: React.ReactNode;
}

export function RingProgress({
  percent,
  size = 80,
  strokeWidth = 8,
  riskLevel = 'low',
  showLabel = true,
  children
}: RingProgressProps) {
  const [offset, setOffset] = useState(251.2);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  useEffect(() => {
    // 延迟动画，让组件先渲染
    const timer = setTimeout(() => {
      setIsAnimating(true);
      setOffset(circumference - (percent / 100) * circumference);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [percent, circumference]);

  const getColor = () => {
    switch (riskLevel) {
      case 'critical': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#eab308';
      default: return '#22c55e';
    }
  };

  const getGlowEffect = () => {
    if (riskLevel === 'critical') {
      return 'filter: drop-shadow(0 0 6px rgba(239, 68, 68, 0.8));';
    }
    if (riskLevel === 'high') {
      return 'filter: drop-shadow(0 0 4px rgba(249, 115, 22, 0.6));';
    }
    return '';
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* 背景圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          opacity={0.3}
        />
        {/* 进度圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={isAnimating ? offset : circumference}
          style={{
            transition: 'stroke-dashoffset 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), stroke 0.3s ease',
            ...(getGlowEffect() && { filter: getGlowEffect() }),
          }}
          className={riskLevel === 'critical' ? 'pulse-glow' : ''}
        />
      </svg>
      
      {/* 中心内容 */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children || (
          showLabel && (
            <span 
              className={`text-sm font-bold ${
                riskLevel === 'critical' ? 'alert-flash' : 
                riskLevel === 'high' ? 'text-orange-500' : 
                riskLevel === 'medium' ? 'text-yellow-500' : 
                'text-green-500'
              }`}
              style={{ color: riskLevel === 'low' || riskLevel === 'medium' || riskLevel === 'high' ? undefined : undefined }}
            >
              {percent}%
            </span>
          )
        )}
      </div>
    </div>
  );
}

/**
 * 风险等级环形组件
 */
interface RiskRingProps {
  hr?: number;
  tcr?: number;
  size?: number;
}

export function RiskRing({ hr, tcr, size = 100 }: RiskRingProps) {
  const getRiskLevel = () => {
    if (!hr && !tcr) return { level: 'normal', percent: 0 };
    
    // HR风险评估
    const hrLevel = hr && hr >= 180 ? 100 : 
                    hr && hr >= 160 ? 75 : 
                    hr && hr >= 140 ? 50 : 
                    hr && hr >= 120 ? 25 : 0;
    
    // TCR风险评估
    const tcrLevel = tcr && tcr >= 38.5 ? 100 :
                     tcr && tcr >= 38.0 ? 75 :
                     tcr && tcr >= 37.5 ? 50 :
                     tcr && tcr >= 37.0 ? 25 : 0;
    
    // 取最高风险
    const maxLevel = Math.max(hrLevel, tcrLevel);
    
    const level = maxLevel >= 100 ? 'critical' :
                  maxLevel >= 75 ? 'high' :
                  maxLevel >= 50 ? 'medium' : 'low';
    
    return { level, percent: maxLevel };
  };

  const { level, percent } = getRiskLevel();

  const getLevelLabel = () => {
    switch (level) {
      case 'critical': return '高危';
      case 'high': return '高风险';
      case 'medium': return '中风险';
      default: return '正常';
    }
  };

  const getTextColor = () => {
    switch (level) {
      case 'critical': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      default: return 'text-green-500';
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <RingProgress
        percent={percent}
        size={size}
        strokeWidth={10}
        riskLevel={level as any}
        showLabel={false}
      >
        <div className="flex flex-col items-center">
          <span className={`text-xl font-bold ${getTextColor()} ${level === 'critical' ? 'alert-flash' : ''}`}>
            {percent}%
          </span>
        </div>
      </RingProgress>
      <span className={`text-sm font-medium ${getTextColor()}`}>
        {getLevelLabel()}
      </span>
    </div>
  );
}
