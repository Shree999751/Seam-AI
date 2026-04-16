# Seam Strength & Durability Analyzer

An AI-powered web application that analyzes seam quality from images to predict strength and durability scores using computer vision and machine learning.

## 🎯 Overview

The Seam Strength & Durability Analyzer is a sophisticated quality control tool that uses Google's Gemini AI to analyze seam images and provide instant feedback on seam quality. It helps manufacturers, quality control teams, and textile professionals assess seam integrity without expensive laboratory equipment.

## ✨ Features

### 🔍 AI-Powered Analysis
- **Image Upload**: Drag & drop or click to upload seam photos
- **Real-time Analysis**: Instant AI-powered seam assessment
- **Multi-format Support**: JPG, PNG, WEBP (up to 10MB)

### 📊 Comprehensive Metrics
- **Strength Score** (0-100%): Predicts tensile strength based on visual features
- **Durability Score** (0-100%): Estimates longevity under normal use
- **Stitch Density**: Measures stitches per inch (SPI)
- **Defect Detection**: Identifies skipped stitches, puckering, thread fraying

### 🤖 Smart Features
- **AI Chat Assistant**: Ask questions about analysis results
- **Export Reports**: Download HTML reports or print analysis
- **Analysis History**: Saves last 20 analyses locally
- **Smart Recommendations**: Actionable improvement suggestions

### 📱 User Experience
- Responsive design (mobile & desktop)
- Dark/Light theme optimized
- Real-time animations and feedback
- No server required (runs entirely in browser)

## 🚀 Demo

[Live Demo](https://your-demo-link.com) *(Coming soon)*

### Screenshots

![Dashboard Preview](screenshots/dashboard.png)
*Main analysis interface*

![Analysis Results](screenshots/results.png)
*Detailed strength and durability metrics*

## 🛠️ Tech Stack

- **Frontend**: HTML5, TailwindCSS, JavaScript
- **AI Model**: Google Gemini API (2.5 Flash / Pro Vision)
- **Icons**: Heroicons, Custom SVG
- **Styling**: Tailwind CSS, Custom animations
- **Storage**: LocalStorage for history

## 📦 Installation

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

### Quick Start

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/seam-analyzer.git
cd seam-analyzer
