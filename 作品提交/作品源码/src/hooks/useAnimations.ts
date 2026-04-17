'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * 计数跳动动画Hook
 * @param value 当前数值
 * @param duration 动画时长(ms)
 */
export function useCountAnimation(value: number, duration: number = 400) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevValue = useRef(value);

  useEffect(() => {
    if (value !== prevValue.current) {
      setIsAnimating(true);
      
      const startValue = prevValue.current;
      const endValue = value;
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // 缓动函数
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentValue = startValue + (endValue - startValue) * easeOut;
        
        setDisplayValue(Math.round(currentValue));
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
          prevValue.current = value;
        }
      };
      
      requestAnimationFrame(animate);
    }
  }, [value, duration]);

  return { displayValue, isAnimating };
}

/**
 * 超标闪烁Hook
 * @param value 当前值
 * @param threshold 阈值
 */
export function useAlertFlash(value: number, threshold: number) {
  const [isFlashing, setIsFlashing] = useState(false);

  useEffect(() => {
    if (value >= threshold) {
      setIsFlashing(true);
    } else {
      setIsFlashing(false);
    }
  }, [value, threshold]);

  return isFlashing;
}

/**
 * 状态点呼吸动画Hook
 */
export function useStatusBreathe(isActive: boolean) {
  const [isBreathing, setIsBreathing] = useState(false);

  useEffect(() => {
    if (isActive) {
      setIsBreathing(true);
    }
  }, [isActive]);

  return isBreathing;
}

/**
 * 风险等级计算Hook
 */
export function useRiskLevel(hr?: number, tcr?: number) {
  const getRiskLevel = useCallback(() => {
    if (!hr && !tcr) return 'normal';
    
    const hrRisk = hr && hr >= 180 ? 'critical' : 
                   hr && hr >= 160 ? 'high' : 
                   hr && hr >= 140 ? 'medium' : 'low';
    
    const tcrRisk = tcr && tcr >= 38.5 ? 'critical' :
                    tcr && tcr >= 38.0 ? 'high' :
                    tcr && tcr >= 37.5 ? 'medium' : 'low';
    
    // 返回最高风险等级
    const levels = ['low', 'medium', 'high', 'critical'];
    const maxRisk = Math.max(
      levels.indexOf(hrRisk),
      levels.indexOf(tcrRisk)
    );
    
    return levels[maxRisk];
  }, [hr, tcr]);

  const riskLevel = getRiskLevel();
  
  const riskPercent = (() => {
    switch (riskLevel) {
      case 'critical': return 100;
      case 'high': return 75;
      case 'medium': return 50;
      default: return 25;
    }
  })();

  return { riskLevel, riskPercent };
}

/**
 * 环形进度条动画Hook
 */
export function useRingProgress(percent: number, duration: number = 600) {
  const [offset, setOffset] = useState(251.2); // 周长为 2 * PI * 40 = 251.2
  
  useEffect(() => {
    const circumference = 251.2;
    const newOffset = circumference - (percent / 100) * circumference;
    
    // 延迟一小段时间后开始动画
    const timeout = setTimeout(() => {
      setOffset(newOffset);
    }, 100);
    
    return () => clearTimeout(timeout);
  }, [percent]);

  return offset;
}

/**
 * 列表依次显示动画Hook
 */
export function useStaggerAnimation(itemCount: number, baseDelay: number = 100) {
  const [visibleItems, setVisibleItems] = useState(0);

  useEffect(() => {
    if (itemCount === 0) return;
    
    let current = 0;
    const interval = setInterval(() => {
      current++;
      setVisibleItems(current);
      if (current >= itemCount) {
        clearInterval(interval);
      }
    }, baseDelay);

    return () => clearInterval(interval);
  }, [itemCount, baseDelay]);

  return visibleItems;
}

/**
 * 波形曲线动画Hook
 */
export function useWaveAnimation(dataLength: number) {
  const [waveProgress, setWaveProgress] = useState(0);

  useEffect(() => {
    const duration = 1500;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setWaveProgress(progress);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [dataLength]);

  return waveProgress;
}

/**
 * 骨架屏动画Hook
 */
export function useSkeletonLoading(isLoading: boolean) {
  return isLoading;
}

/**
 * 空状态浮动动画
 */
export function useFloatAnimation() {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    let direction = 1;
    let current = 0;
    
    const animate = () => {
      current += 0.1 * direction;
      if (current >= 10 || current <= 0) {
        direction *= -1;
      }
      setOffset(current);
      requestAnimationFrame(animate);
    };
    
    const frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  return offset;
}
