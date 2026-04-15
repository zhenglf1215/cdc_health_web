'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Thermometer, HeartPulse, Activity } from 'lucide-react';

export default function VitalsLayout() {
  const pathname = usePathname();

  const tabs = [
    { id: 'tcr', label: 'Tcr', href: '/applicant/vitals/tcr', icon: Thermometer, color: 'text-orange-600', bg: 'bg-orange-100' },
    { id: 'tsk', label: 'Tsk', href: '/applicant/vitals/tsk', icon: Thermometer, color: 'text-yellow-600', bg: 'bg-yellow-100' },
    { id: 'hr', label: 'HR', href: '/applicant/vitals/hr', icon: HeartPulse, color: 'text-red-600', bg: 'bg-red-100' },
  ];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">生命体征监测</h1>
        <p className="text-gray-500 mt-1">实时监测您的核心生理指标</p>
      </div>

      {/* 横向导航栏 */}
      <div className="bg-white rounded-xl shadow-sm p-2">
        <div className="grid grid-cols-3 gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.href;
            
            return (
              <Link key={tab.id} href={tab.href}>
                <Card className={`cursor-pointer transition-all ${
                  isActive 
                    ? 'ring-2 ring-blue-500 shadow-md' 
                    : 'hover:shadow-md'
                }`}>
                  <div className="p-4 flex flex-col items-center space-y-2">
                    <div className={`w-12 h-12 ${tab.bg} rounded-xl flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${tab.color}`} />
                    </div>
                    <span className={`font-semibold ${isActive ? 'text-blue-600' : 'text-gray-700'}`}>
                      {tab.label}
                    </span>
                    <span className="text-xs text-gray-500">
                      {tab.id === 'tre' ? '核心温度' : tab.id === 'tsk' ? '皮肤温度' : '心率'}
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 当前选中的内容 */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        {pathname === '/applicant/vitals' && (
          <div className="text-center py-12">
            <Activity className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900">请选择监测指标</h3>
            <p className="text-gray-500 mt-2">点击上方导航查看具体的生命体征数据</p>
          </div>
        )}
      </div>
    </div>
  );
}
