"use client";

import { useState, useEffect, Fragment } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CdcDataItem {
  environment: string;
  cdc_hr: number | null;
  cdc_tcr: number | null;
  cdc_tsk: number | null;
  participant_count: number;
  participants: string[];
}

export default function AdminCDCDataPage() {
  const [cdcData, setCdcData] = useState<CdcDataItem[]>([]);
  const [cdcLoading, setCdcLoading] = useState(true);
  const [expandedEnvs, setExpandedEnvs] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadCdcData();
  }, []);

  // 加载CDC环境数据
  const loadCdcData = async () => {
    setCdcLoading(true);
    try {
      const response = await fetch('/api/cdc-calculate?perspective=environment');
      if (response.ok) {
        const data = await response.json();
        setCdcData(data.environments || []);
      }
    } catch (error) {
      console.error('加载CDC数据失败:', error);
    } finally {
      setCdcLoading(false);
    }
  };

  const toggleExpand = (env: string) => {
    const newExpanded = new Set(expandedEnvs);
    if (newExpanded.has(env)) {
      newExpanded.delete(env);
    } else {
      newExpanded.add(env);
    }
    setExpandedEnvs(newExpanded);
  };

  if (cdcLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">环境CDC数据</h1>
        <p className="text-gray-500 mt-1">查看所有环境的CDC测量数据</p>
      </div>

      {/* CDC数据表格 */}
      <Card>
        <CardHeader>
          <CardTitle>CDC数据</CardTitle>
          <CardDescription>环境适应能力评估数据，需要至少2个参与者的数据才能计算CDC</CardDescription>
        </CardHeader>
        <CardContent>
          {cdcData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left font-medium text-gray-600 border border-gray-200">
                      环境名称
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600 border border-gray-200">
                      CDC-HR
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600 border border-gray-200">
                      CDC-Tre
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600 border border-gray-200">
                      CDC-Tsk
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600 border border-gray-200">
                      参与者
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cdcData.map((item, index) => {
                    const isExpanded = expandedEnvs.has(item.environment);
                    return (
                      <Fragment key={`${item.environment}-${index}`}>
                        <tr className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 border border-gray-200">
                            <div className="font-medium text-gray-900">{item.environment}</div>
                          </td>
                          <td className="px-4 py-3 text-center border border-gray-200">
                            {item.participant_count >= 2 && item.cdc_hr !== null ? item.cdc_hr.toFixed(3) : '-'}
                          </td>
                          <td className="px-4 py-3 text-center border border-gray-200">
                            {item.participant_count >= 2 && item.cdc_tcr !== null ? item.cdc_tcr.toFixed(3) : '-'}
                          </td>
                          <td className="px-4 py-3 text-center border border-gray-200">
                            {item.participant_count >= 2 && item.cdc_tsk !== null ? item.cdc_tsk.toFixed(3) : '-'}
                          </td>
                          <td 
                            className="px-4 py-3 text-center border border-gray-200 cursor-pointer hover:bg-blue-50 transition-colors"
                            onClick={() => toggleExpand(item.environment)}
                          >
                            <div className="flex items-center justify-center gap-1 text-blue-600">
                              <span>{item.participant_count}人</span>
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-blue-50">
                            <td colSpan={5} className="px-4 py-3 border border-gray-200">
                              <div className="flex flex-wrap gap-2">
                                <span className="text-sm text-gray-600 mr-2">参与者：</span>
                                {item.participants.map((name, i) => (
                                  <Badge key={`${item.environment}-participant-${i}`} variant="secondary" className="bg-blue-100 text-blue-800">
                                    {name}
                                  </Badge>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              暂无CDC数据
            </div>
          )}
          {cdcData.length > 0 && (
            <p className="text-sm text-gray-500 mt-4">
              * CDC计算需要该环境至少2个参与者的数据
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
