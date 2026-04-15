'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Heart,
  Thermometer,
  Activity,
  ChevronDown,
  Check,
  Battery,
  Wifi,
  Globe,
  Sun,
  ArrowRight
} from 'lucide-react';
import '@/styles/cdc-animations.css';

export default function ProductsPage() {
  const [activeSection, setActiveSection] = useState<'cdc' | 'watch'>('cdc');

  const handleLogin = () => {
    window.location.href = '/auth';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-300 to-orange-200">
      {/* 导航栏 - iPhone17风格玻璃拟态 */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/40 backdrop-blur-2xl border-b border-white/30 shadow-lg">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <span className="text-blue-700 text-xl font-bold tracking-tight">CDC 智能监测</span>
              <button
                onClick={() => setActiveSection('cdc')}
                className={`text-sm font-medium transition-all duration-300 ${
                  activeSection === 'cdc'
                    ? 'text-orange-600 scale-105'
                    : 'text-gray-600 hover:text-orange-600'
                }`}
              >
                CDC系统
              </button>
              <button
                onClick={() => setActiveSection('watch')}
                className={`text-sm font-medium transition-all duration-300 ${
                  activeSection === 'watch'
                    ? 'text-orange-600 scale-105'
                    : 'text-gray-600 hover:text-orange-600'
                }`}
              >
                传感贴片
              </button>
            </div>
            <div className="flex items-center gap-4">
              <Button
                onClick={handleLogin}
                variant="ghost"
                className="text-gray-600 hover:text-orange-600 spring-bounce"
              >
                登录
              </Button>
              <Button
                onClick={handleLogin}
                className="bg-gradient-to-r from-blue-500 to-orange-500 hover:from-blue-600 hover:to-orange-600 text-white px-6 shadow-lg shadow-blue-500/30 spring-bounce"
              >
                注册
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* CDC系统展示 */}
      {activeSection === 'cdc' && (
        <main className="pt-24">
          {/* Hero Section */}
          <section className="max-w-7xl mx-auto px-6 py-24">
            <div className="text-center max-w-4xl mx-auto">
              <Badge className="bg-blue-500/30 text-blue-800 border-orange-400/40 text-sm mb-6 backdrop-blur-xl glass-effect">
                革新环境监测技术
              </Badge>
              <h1 className="text-5xl md:text-7xl font-bold text-gray-900 tracking-tight mb-6 fade-in-up">
                CDC 系统
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 leading-relaxed mb-12 fade-in-up delay-100">
                基于心率、核心温度和皮肤温度的多维度环境适应能力评估系统
              </p>
              <div className="flex justify-center gap-4 fade-in-up delay-200">
                <Button
                  onClick={handleLogin}
                  size="lg"
                  className="bg-gradient-to-r from-blue-500 to-orange-500 hover:from-blue-600 hover:to-orange-600 text-white text-lg px-8 shadow-lg shadow-blue-500/30 spring-bounce"
                >
                  立即开始
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button
                  onClick={() => setActiveSection('watch')}
                  size="lg"
                  variant="outline"
                  className="border-blue-500 text-blue-700 hover:bg-blue-50 text-lg px-8 spring-bounce"
                >
                  了解硬件
                </Button>
              </div>
            </div>
          </section>

          {/* 三大指标 */}
          <section className="max-w-7xl mx-auto px-6 py-24">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 text-center mb-16 fade-in-up">
              三大核心指标
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="bg-white/40 backdrop-blur-xl border border-white/30 shadow-xl shadow-blue-500/10 card-hover fade-in-up delay-100">
                <CardContent className="p-8">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center mb-6 shadow-lg shadow-red-500/30">
                    <Heart className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">心率</h3>
                  <p className="text-gray-600 text-lg leading-relaxed mb-8">
                    实时跟踪心率变化，结合环境温度分析生理负荷，及时发现潜在风险。
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-gray-700">24小时连续监测</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-gray-700">智能异常预警</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-gray-700">多环境数据对比</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/40 backdrop-blur-xl border border-white/30 shadow-xl shadow-orange-500/10 card-hover fade-in-up delay-200">
                <CardContent className="p-8">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mb-6 shadow-lg shadow-orange-500/30">
                    <Thermometer className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">核心温度</h3>
                  <p className="text-gray-600 text-lg leading-relaxed mb-8">
                    精确测量核心体温变化，评估环境对体温调节系统的影响。
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-orange-500" />
                      <span className="text-sm text-gray-700">医用级传感器</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-orange-500" />
                      <span className="text-sm text-gray-700">实时温度追踪</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-orange-500" />
                      <span className="text-sm text-gray-700">历史数据分析</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/40 backdrop-blur-xl border border-white/30 shadow-xl shadow-cyan-500/10 card-hover fade-in-up delay-300">
                <CardContent className="p-8">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center mb-6 shadow-lg shadow-cyan-500/30">
                    <Activity className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">皮肤温度</h3>
                  <p className="text-gray-600 text-lg leading-relaxed mb-8">
                    监测体表温度分布，分析环境适应性，提供个性化健康建议。
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-cyan-500" />
                      <span className="text-sm text-gray-700">多点温度采集</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-cyan-500" />
                      <span className="text-sm text-gray-700">温差分析</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-cyan-500" />
                      <span className="text-sm text-gray-700">环境关联分析</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* CDC计算模型 */}
          <section className="max-w-7xl mx-auto px-6 py-24">
            <div className="bg-white/40 backdrop-blur-2xl border border-white/30 rounded-3xl p-16 shadow-2xl shadow-blue-500/10 glass-effect fade-in-up">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                  CDC 计算模型
                </h2>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                  基于数据驱动算法，综合评估环境适应能力
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-red-50/60 backdrop-blur-xl border border-red-200/50 rounded-2xl p-8 text-center card-hover grow-up">
                  <div className="text-4xl font-bold text-gray-900 mb-2">AD</div>
                  <div className="text-sm text-gray-600">绝对差值</div>
                </div>
                <div className="bg-blue-50/60 backdrop-blur-xl border border-blue-200/50 rounded-2xl p-8 text-center card-hover grow-up delay-100">
                  <div className="text-4xl font-bold text-gray-900 mb-2">CV</div>
                  <div className="text-sm text-gray-600">变异系数</div>
                </div>
                <div className="bg-purple-50/60 backdrop-blur-xl border border-purple-200/50 rounded-2xl p-8 text-center card-hover grow-up delay-200">
                  <div className="text-4xl font-bold text-gray-900 mb-2">SKEW</div>
                  <div className="text-sm text-gray-600">偏度系数</div>
                </div>
                <div className="bg-gradient-to-br from-blue-500/20 to-orange-500/20 backdrop-blur-xl border border-blue-300/50 rounded-2xl p-8 text-center card-hover grow-up delay-300">
                  <div className="text-4xl font-bold text-blue-600 mb-2">CDC</div>
                  <div className="text-sm text-gray-600">综合指标</div>
                </div>
              </div>
            </div>
          </section>

          {/* 技术优势 */}
          <section className="max-w-7xl mx-auto px-6 py-24">
            <h2 className="text-4xl font-bold text-gray-900 text-center mb-16 fade-in-up">
              技术优势
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <Card className="bg-white/40 backdrop-blur-xl border border-white/30 p-6 text-center card-hover fade-in-up">
                <CardContent className="p-0">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
                    <Wifi className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">实时传输</h3>
                  <p className="text-sm text-gray-600">5G/蓝牙双模传输</p>
                </CardContent>
              </Card>

              <Card className="bg-white/40 backdrop-blur-xl border border-white/30 p-6 text-center card-hover fade-in-up delay-100">
                <CardContent className="p-0">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/30">
                    <Battery className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">超长续航</h3>
                  <p className="text-sm text-gray-600">7天持续监测</p>
                </CardContent>
              </Card>

              <Card className="bg-white/40 backdrop-blur-xl border border-white/30 p-6 text-center card-hover fade-in-up delay-200">
                <CardContent className="p-0">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-purple-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/30">
                    <Globe className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">云端同步</h3>
                  <p className="text-sm text-gray-600">数据云端备份</p>
                </CardContent>
              </Card>

              <Card className="bg-white/40 backdrop-blur-xl border border-white/30 p-6 text-center card-hover fade-in-up delay-300">
                <CardContent className="p-0">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/30">
                    <Sun className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">智能预警</h3>
                  <p className="text-sm text-gray-600">AI风险评估</p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* 适用人群 */}
          <section className="max-w-7xl mx-auto px-6 py-24">
            <h2 className="text-4xl font-bold text-gray-900 text-center mb-16 fade-in-up">
              适用人群
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="bg-white/40 backdrop-blur-xl border border-white/30 p-8 text-center card-hover fade-in-up">
                <CardContent className="p-0">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/30">
                    <Activity className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">高温作业人员</h3>
                  <p className="text-gray-600">钢铁冶金、建筑施工、电力抢修等高温环境工作者</p>
                </CardContent>
              </Card>

              <Card className="bg-white/40 backdrop-blur-xl border border-white/30 p-8 text-center card-hover fade-in-up delay-100">
                <CardContent className="p-0">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-400 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
                    <Heart className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">运动爱好者</h3>
                  <p className="text-gray-600">马拉松跑者、健身爱好者、户外运动者</p>
                </CardContent>
              </Card>

              <Card className="bg-white/40 backdrop-blur-xl border border-white/30 p-8 text-center card-hover fade-in-up delay-200">
                <CardContent className="p-0">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-indigo-400 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-purple-500/30">
                    <Globe className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">特殊行业</h3>
                  <p className="text-gray-600">军事训练、航空航天、消防救援等特殊行业</p>
                </CardContent>
              </Card>
            </div>
          </section>
        </main>
      )}

      {/* 有机干电极贴片展示 - 与新加坡国立大学合作 */}
      {activeSection === 'watch' && (
        <main className="pt-24">
          {/* Hero Section */}
          <section className="text-center py-16">
            <Badge className="bg-purple-500/20 text-purple-700 border-purple-500/30 text-sm mb-4 glass-effect fade-in-up">
              新加坡国立大学研究院联合研发
            </Badge>
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 tracking-tight mb-6 fade-in-up delay-100">
              保形有机表皮干电极
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-6 fade-in-up delay-200">
              测量人体心率和皮肤表面温度
            </p>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto fade-in-up delay-300">
              基于 PEDOT:PSS 等导电高分子材料，实现完全有机的柔性导电传感
            </p>
          </section>

          {/* 产品展示 */}
          <section className="py-12">
            <div className="max-w-7xl mx-auto px-6">
              {/* 主产品图 */}
              <div className="flex justify-center gap-8 mb-20 flex-wrap">
                <div className="relative float-animation">
                  <div className="w-[450px] h-[450px] bg-white/40 backdrop-blur-xl border border-white/30 rounded-3xl shadow-2xl shadow-purple-500/10 p-4 overflow-hidden glass-effect">
                    <img
                      src="/electrode-patch-1.jpg"
                      alt="有机干电极贴片"
                      className="w-full h-full object-cover rounded-2xl"
                    />
                  </div>
                </div>
                <div className="relative float-animation delay-200">
                  <div className="w-[450px] h-[450px] bg-white/40 backdrop-blur-xl border border-white/30 rounded-3xl shadow-2xl shadow-purple-500/10 p-4 overflow-hidden glass-effect">
                    <img
                      src="/electrode-patch-2.jpg"
                      alt="有机干电极微观结构"
                      className="w-full h-full object-cover rounded-2xl"
                    />
                  </div>
                </div>
              </div>

              {/* 核心亮点 */}
              <div className="max-w-6xl mx-auto mb-20">
                <h2 className="text-4xl font-bold text-gray-900 text-center mb-12 fade-in-up">
                  三大核心亮点
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* 亮点1：核心温度递推计算 */}
                  <Card className="bg-gradient-to-br from-orange-50/60 to-orange-100/60 backdrop-blur-xl border border-orange-200/30 shadow-xl shadow-orange-500/10 card-hover fade-in-up delay-100">
                    <CardContent className="p-8">
                      <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-500/30">
                        <Thermometer className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">核心温度递推算法</h3>
                      <p className="text-gray-600 text-sm text-center mb-4">
                        基于劳动代谢率(Mi)递推计算核心温度(Tcr)，实时评估体温调节状态
                      </p>
                      <div className="bg-white/60 backdrop-blur-xl border border-white/30 rounded-xl p-3 text-xs font-mono text-gray-700">
                        Tcr(t+1) = Tcr(t) + f(Mi)
                      </div>
                    </CardContent>
                  </Card>

                  {/* 亮点2：劳动代谢率实时监测 */}
                  <Card className="bg-gradient-to-br from-purple-50/60 to-purple-100/60 backdrop-blur-xl border border-purple-200/30 shadow-xl shadow-purple-500/10 card-hover fade-in-up delay-200">
                    <CardContent className="p-8">
                      <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-purple-500/30">
                        <Activity className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">劳动代谢率(Mi)监测</h3>
                      <p className="text-gray-600 text-sm text-center mb-4">
                        综合心率、年龄、体重计算实时劳动代谢率，评估体力消耗强度
                      </p>
                      <div className="bg-white/60 backdrop-blur-xl border border-white/30 rounded-xl p-3 text-xs font-mono text-gray-700">
                        Mi = f(HR, Age, Weight)
                      </div>
                    </CardContent>
                  </Card>

                  {/* 亮点3：自动高温报警 */}
                  <Card className="bg-gradient-to-br from-red-50/60 to-red-100/60 backdrop-blur-xl border border-red-200/30 shadow-xl shadow-red-500/10 card-hover fade-in-up delay-300">
                    <CardContent className="p-8">
                      <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-500/30 pulse-glow">
                        <Heart className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">智能高温报警</h3>
                      <p className="text-gray-600 text-sm text-center mb-4">
                        HR≥180bpm 或 TCR≥38°C 时自动触发声光报警，及时预警热射病风险
                      </p>
                      <div className="bg-white/60 backdrop-blur-xl border border-white/30 rounded-xl p-3 text-xs font-mono text-gray-700">
                        阈值：HR≥180 | Tcr≥38°C
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* 技术优势 */}
              <div className="max-w-6xl mx-auto mb-20">
                <h2 className="text-4xl font-bold text-gray-900 text-center mb-12 fade-in-up">
                  有机干电极技术优势
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card className="bg-white/40 backdrop-blur-xl border border-white/30 shadow-lg card-hover fade-in-up">
                    <CardContent className="p-6 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/30">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </div>
                      <h3 className="font-bold text-gray-900 mb-2">机械柔性+自粘附</h3>
                      <p className="text-sm text-gray-600">完美贴合皮肤曲面，重物负载也不脱落</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/40 backdrop-blur-xl border border-white/30 shadow-lg card-hover fade-in-up delay-100">
                    <CardContent className="p-6 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <h3 className="font-bold text-gray-900 mb-2">高导电率</h3>
                      <p className="text-sm text-gray-600">稳定传输微弱生物电信号</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/40 backdrop-blur-xl border border-white/30 shadow-lg card-hover fade-in-up delay-200">
                    <CardContent className="p-6 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-cyan-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-cyan-500/30">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                      </div>
                      <h3 className="font-bold text-gray-900 mb-2">抗汗可拉伸</h3>
                      <p className="text-sm text-gray-600">运动出汗时也能保持稳定接触</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/40 backdrop-blur-xl border border-white/30 shadow-lg card-hover fade-in-up delay-300">
                    <CardContent className="p-6 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-400 to-purple-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/30">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <h3 className="font-bold text-gray-900 mb-2">保形接触</h3>
                      <p className="text-sm text-gray-600">大幅降低接触阻抗和运动伪影</p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* 测量原理 */}
              <div className="max-w-6xl mx-auto mb-20">
                <div className="bg-white/40 backdrop-blur-2xl border border-white/30 rounded-3xl p-12 shadow-2xl glass-effect fade-in-up">
                  <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">
                    双模测量原理
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    {/* 心率测量 */}
                    <div className="text-center">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-400 to-red-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-500/30 grow-up">
                        <Heart className="w-10 h-10 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-4">心率测量 (ECG法)</h3>
                      <div className="text-left bg-red-50/60 backdrop-blur-xl border border-red-200/50 rounded-xl p-6 space-y-3">
                        <div className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500 text-white text-sm flex items-center justify-center">1</span>
                          <p className="text-sm text-gray-700">有机干电极贴附皮肤，捕捉心脏电活动信号</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500 text-white text-sm flex items-center justify-center">2</span>
                          <p className="text-sm text-gray-700">信号采集模块放大、滤波，还原心电图波形</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500 text-white text-sm flex items-center justify-center">3</span>
                          <p className="text-sm text-gray-700">识别QRS波群间隔，计算心率 BPM</p>
                        </div>
                      </div>
                    </div>

                    {/* 皮肤温度测量 */}
                    <div className="text-center">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-500/30 grow-up delay-100">
                        <Thermometer className="w-10 h-10 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-4">皮肤温度测量 (NTC法)</h3>
                      <div className="text-left bg-orange-50/60 backdrop-blur-xl border border-orange-200/50 rounded-xl p-6 space-y-3">
                        <div className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-500 text-white text-sm flex items-center justify-center">1</span>
                          <p className="text-sm text-gray-700">PEDOT:PSS热敏复合传感层感知温度变化</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-500 text-white text-sm flex items-center justify-center">2</span>
                          <p className="text-sm text-gray-700">温度升高导致载流子迁移率提升，电阻下降</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-500 text-white text-sm flex items-center justify-center">3</span>
                          <p className="text-sm text-gray-700">结合Mi递推核心温度，评估热应激状态</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 应用场景 */}
              <div className="max-w-7xl mx-auto pb-24">
                <h2 className="text-4xl font-bold text-gray-900 text-center mb-12 fade-in-up">
                  应用场景
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* 高温作业环境 */}
                  <Card className="bg-white/40 backdrop-blur-xl border border-white/30 rounded-3xl overflow-hidden card-hover fade-in-up">
                    <div className="relative h-48">
                      <img 
                        src="https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=300&fit=crop"
                        alt="高温作业环境"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-4 left-4 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                          <Globe className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-white font-bold">高温作业环境</span>
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-gray-600 text-sm leading-relaxed">
                        钢铁冶金、建筑施工等高温作业人员的热风险监测
                      </p>
                    </div>
                  </Card>

                  {/* 运动训练监测 */}
                  <Card className="bg-white/40 backdrop-blur-xl border border-white/30 rounded-3xl overflow-hidden card-hover fade-in-up delay-100">
                    <div className="relative h-48">
                      <img 
                        src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&h=300&fit=crop"
                        alt="运动训练监测"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-4 left-4 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center shadow-lg shadow-green-500/30">
                          <Activity className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-white font-bold">运动训练监测</span>
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-gray-600 text-sm leading-relaxed">
                        运动员训练时的生理负荷和热适应能力评估
                      </p>
                    </div>
                  </Card>

                  {/* 军事训练保障 */}
                  <Card className="bg-white/40 backdrop-blur-xl border border-white/30 rounded-3xl overflow-hidden card-hover fade-in-up delay-200">
                    <div className="relative h-48">
                      <img 
                        src="https://images.unsplash.com/photo-1547928576-b822bc410bdf?w=400&h=300&fit=crop"
                        alt="军事训练保障"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-4 left-4 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                          <Sun className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-white font-bold">军事训练保障</span>
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-gray-600 text-sm leading-relaxed">
                        部队野外训练的热习服和体能监测
                      </p>
                    </div>
                  </Card>

                  {/* 医疗健康 */}
                  <Card className="bg-white/40 backdrop-blur-xl border border-white/30 rounded-3xl overflow-hidden card-hover fade-in-up delay-300">
                    <div className="relative h-48">
                      <img 
                        src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400&h=300&fit=crop"
                        alt="医疗健康监测"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-4 left-4 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-400 to-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                          <Heart className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-white font-bold">医疗健康监测</span>
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-gray-600 text-sm leading-relaxed">
                        实时生命体征监测，远程医疗健康监护
                      </p>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          </section>
        </main>
      )}

      {/* 底部 CTA */}
      <footer className="bg-white/30 backdrop-blur-2xl border-t border-white/20">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 fade-in-up">
              开始您的 CDC 之旅
            </h2>
            <p className="text-xl text-gray-600 mb-12 fade-in-up delay-100">
              立即登录，体验专业的环境健康监测服务
            </p>
            <Button
              onClick={handleLogin}
              size="lg"
              className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white text-lg px-10 shadow-lg shadow-blue-500/30 spring-bounce fade-in-up delay-200"
            >
              立即登录
              <ChevronDown className="ml-2 w-5 h-5 rotate-90" />
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
