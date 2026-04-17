#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
有机表皮干电极产品介绍PPT（2页）- 含图片版
新加坡国立大学 - 人体心率和皮肤表面温度测量
"""

from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE
import os

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)

# 配色
C_DARK = RGBColor(15, 25, 50)
C_BLUE = RGBColor(0, 120, 255)
C_CYAN = RGBColor(0, 220, 255)
C_ORANGE = RGBColor(255, 140, 0)
C_RED = RGBColor(255, 60, 60)
C_GREEN = RGBColor(0, 200, 120)
C_PURPLE = RGBColor(180, 100, 200)
C_WHITE = RGBColor(255, 255, 255)
C_LIGHT = RGBColor(248, 250, 255)
C_GRAY = RGBColor(100, 110, 120)

IMG_DIR = "/workspace/projects/electrode_images"

def add_bg(slide, color):
    bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    bg.fill.solid()
    bg.fill.fore_color.rgb = color
    bg.line.fill.background()

def add_card(slide, left, top, width, height, fill=None, line_color=None):
    if fill is None:
        fill = C_WHITE
    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    card.fill.solid()
    card.fill.fore_color.rgb = fill
    if line_color:
        card.line.color.rgb = line_color
    else:
        card.line.fill.background()
    return card

def add_image(slide, path, left, top, width, height):
    if os.path.exists(path):
        try:
            slide.shapes.add_picture(path, left, top, width, height)
            return True
        except:
            return False
    return False

# ========== 第1页：产品介绍 + 图片 ==========
def slide1_product():
    s = prs.slides.add_slide(prs.slide_layouts[6])
    add_bg(s, C_DARK)
    
    # 装饰圆
    for x, y, size in [(Inches(-1), Inches(-1), Inches(3)), (Inches(11), Inches(5), Inches(3))]:
        c = s.shapes.add_shape(MSO_SHAPE.OVAL, x, y, size, size)
        c.fill.solid()
        c.fill.fore_color.rgb = RGBColor(0, 60, 120)
        c.line.fill.background()
    
    # 机构标签
    tag = add_card(s, Inches(3.5), Inches(0.3), Inches(6.5), Inches(0.5), C_ORANGE)
    t = s.shapes.add_textbox(Inches(3.5), Inches(0.4), Inches(6.5), Inches(0.4))
    tf = t.text_frame
    p = tf.paragraphs[0]
    p.text = "🏛️ 新加坡国立大学研究院"
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = C_WHITE
    p.alignment = PP_ALIGN.CENTER
    
    # 主标题
    title = s.shapes.add_textbox(Inches(0.3), Inches(0.9), Inches(6.5), Inches(0.8))
    tf = title.text_frame
    p = tf.paragraphs[0]
    p.text = "保形有机表皮干电极"
    p.font.size = Pt(36)
    p.font.bold = True
    p.font.color.rgb = C_WHITE
    
    # 副标题
    sub = s.shapes.add_textbox(Inches(0.3), Inches(1.6), Inches(6.5), Inches(0.5))
    tf = sub.text_frame
    p = tf.paragraphs[0]
    p.text = "测量人体心率和皮肤表面温度"
    p.font.size = Pt(18)
    p.font.color.rgb = C_CYAN
    
    # 核心材料
    mat_box = s.shapes.add_textbox(Inches(0.3), Inches(2.2), Inches(6.5), Inches(0.4))
    tf = mat_box.text_frame
    p = tf.paragraphs[0]
    p.text = "💡 核心材料：PEDOT:PSS导电高分子 + 柔性弹性基底"
    p.font.size = Pt(12)
    p.font.color.rgb = C_ORANGE
    
    # 四大特性 - 左侧
    features = [
        ("🤸", "机械柔性+自粘附", "完美贴合皮肤\n重物负载不脱落", C_BLUE),
        ("⚡", "高导电率", "稳定传输微弱信号\n可直接点亮LED", C_GREEN),
        ("💧", "抗汗可拉伸", "运动出汗稳定接触\n无凝胶失效问题", C_CYAN),
        ("🔗", "保形接触", "紧密贴合曲面\n降低接触阻抗", C_PURPLE),
    ]
    
    y = 2.8
    for icon, title_text, desc, color in features:
        card = add_card(s, Inches(0.3), Inches(y), Inches(6.3), Inches(0.95), RGBColor(20, 40, 80), color)
        
        icon_box = s.shapes.add_textbox(Inches(0.5), Inches(y + 0.15), Inches(0.6), Inches(0.6))
        tf = icon_box.text_frame
        p = tf.paragraphs[0]
        p.text = icon
        p.font.size = Pt(24)
        
        t_box = s.shapes.add_textbox(Inches(1.2), Inches(y + 0.1), Inches(2), Inches(0.4))
        tf = t_box.text_frame
        p = tf.paragraphs[0]
        p.text = title_text
        p.font.size = Pt(13)
        p.font.bold = True
        p.font.color.rgb = C_WHITE
        
        d_box = s.shapes.add_textbox(Inches(1.2), Inches(y + 0.5), Inches(5.2), Inches(0.4))
        tf = d_box.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = desc
        p.font.size = Pt(10)
        p.font.color.rgb = RGBColor(180, 200, 220)
        
        y += 1.05
    
    # 右侧：图片展示
    # 图片1 - 电极展示
    img1_path = os.path.join(IMG_DIR, "image1.jpeg")
    if os.path.exists(img1_path):
        add_image(s, img1_path, Inches(7), Inches(0.8), Inches(6), Inches(3))
    
    # 图片2 - 原理示意
    img2_path = os.path.join(IMG_DIR, "image2.jpeg")
    if os.path.exists(img2_path):
        add_image(s, img2_path, Inches(7), Inches(4), Inches(6), Inches(3.2))
    
    # 图片标注
    note1 = s.shapes.add_textbox(Inches(7), Inches(3.7), Inches(6), Inches(0.3))
    tf = note1.text_frame
    p = tf.paragraphs[0]
    p.text = "📷 有机干电极实物展示"
    p.font.size = Pt(10)
    p.font.color.rgb = C_ORANGE
    
    note2 = s.shapes.add_textbox(Inches(7), Inches(7.1), Inches(6), Inches(0.3))
    tf = note2.text_frame
    p = tf.paragraphs[0]
    p.text = "📷 皮肤贴合应用示意"
    p.font.size = Pt(10)
    p.font.color.rgb = C_ORANGE

# ========== 第2页：测量原理 + 图片 ==========
def slide2_principle():
    s = prs.slides.add_slide(prs.slide_layouts[6])
    add_bg(s, C_LIGHT)
    
    # 标题栏
    header = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, Inches(0.8))
    header.fill.solid()
    header.fill.fore_color.rgb = C_DARK
    header.line.fill.background()
    
    title = s.shapes.add_textbox(Inches(0.5), Inches(0.15), Inches(8), Inches(0.5))
    tf = title.text_frame
    p = tf.paragraphs[0]
    p.text = "测量原理"
    p.font.size = Pt(28)
    p.font.bold = True
    p.font.color.rgb = C_WHITE
    
    # 左侧：测量方法说明
    method_title = s.shapes.add_textbox(Inches(0.3), Inches(1), Inches(5), Inches(0.4))
    tf = method_title.text_frame
    p = tf.paragraphs[0]
    p.text = "📋 双重测量方法"
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = C_DARK
    
    # 心率测量卡片
    hr_card = add_card(s, Inches(0.3), Inches(1.5), Inches(5.5), Inches(2.2), C_WHITE, C_RED)
    
    hr_title = s.shapes.add_textbox(Inches(0.5), Inches(1.65), Inches(5), Inches(0.4))
    tf = hr_title.text_frame
    p = tf.paragraphs[0]
    p.text = "❤️ 心率测量：ECG心电图法"
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = C_RED
    
    hr_steps = [
        "① 电极贴附 → 干电极直接粘贴皮肤，无需凝胶",
        "② 信号采集 → 捕捉皮肤表面微弱心电信号",
        "③ 信号处理 → 放大、滤波去除噪声",
        "④ 心率计算 → 识别QRS波群，计算心率",
    ]
    
    y = 2.15
    for step in hr_steps:
        s_box = s.shapes.add_textbox(Inches(0.5), Inches(y), Inches(5.1), Inches(0.35))
        tf = s_box.text_frame
        p = tf.paragraphs[0]
        p.text = step
        p.font.size = Pt(10)
        p.font.color.rgb = C_GRAY
        y += 0.4
    
    # 温度测量卡片
    temp_card = add_card(s, Inches(0.3), Inches(3.9), Inches(5.5), Inches(2.2), C_WHITE, C_BLUE)
    
    temp_title = s.shapes.add_textbox(Inches(0.5), Inches(4.05), Inches(5), Inches(0.4))
    tf = temp_title.text_frame
    p = tf.paragraphs[0]
    p.text = "🌡️ 温度测量：NTC热敏电阻法"
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = C_BLUE
    
    temp_content = [
        "📋 热敏复合层：PEDOT:PSS + 碳纳米管 + WPU/Ecoflex",
        "⚡ NTC效应：温度↑ → 载流子迁移率↑ → 电阻↓",
        "✨ 同基底共集成：一片超薄基底 = ECG + 热敏传感",
    ]
    
    y = 4.5
    for content in temp_content:
        c_box = s.shapes.add_textbox(Inches(0.5), Inches(y), Inches(5.1), Inches(0.4))
        tf = c_box.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = content
        p.font.size = Pt(10)
        p.font.color.rgb = C_GRAY
        y += 0.5
    
    # 右侧：图片展示
    # 图片3 - 测量原理图
    img3_path = os.path.join(IMG_DIR, "image3.jpeg")
    if os.path.exists(img3_path):
        add_image(s, img3_path, Inches(6), Inches(1), Inches(7), Inches(2.8))
    
    note3 = s.shapes.add_textbox(Inches(6), Inches(3.7), Inches(7), Inches(0.3))
    tf = note3.text_frame
    p = tf.paragraphs[0]
    p.text = "📷 测量系统与信号处理"
    p.font.size = Pt(10)
    p.font.color.rgb = C_ORANGE
    
    # 图片4 - 对比图
    img4_path = os.path.join(IMG_DIR, "image4.jpeg")
    if os.path.exists(img4_path):
        add_image(s, img4_path, Inches(6), Inches(4.1), Inches(7), Inches(3.2))
    
    note4 = s.shapes.add_textbox(Inches(6), Inches(7.2), Inches(7), Inches(0.3))
    tf = note4.text_frame
    p = tf.paragraphs[0]
    p.text = "📷 性能对比分析"
    p.font.size = Pt(10)
    p.font.color.rgb = C_ORANGE

# ========== 生成 ==========
print("🎨 正在生成含图片的PPT...")

slide1_product()
slide2_principle()

output_path = "/workspace/projects/有机表皮干电极_产品PPT_含图.pptx"
prs.save(output_path)
print(f"✅ PPT生成成功！")
print(f"📁 文件：{output_path}")
print(f"📊 共2页 - 嵌入4张原图")
