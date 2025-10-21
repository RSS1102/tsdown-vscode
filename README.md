# Cherry Markdown Preview

A markdown previewer powered by [cherry-markdown](https://github.com/Tencent/cherry-markdown) for VSCode.

## Features

- Live preview of Markdown files
- Support for themes
- Image upload and export
- Synchronized scrolling between editor and preview
- Edit mode toggle

## Usage

1. Open a Markdown file in VSCode
2. Use `F10` or right-click and select "Preview Markdown with Cherry" to open the preview
3. The preview will update automatically as you edit

## Configuration

- `cherryMarkdown.Usage`: Set to "active" for automatic preview on file open
- `cherryMarkdown.Theme`: Choose from "default", "dark", "green", "red"
- `cherryMarkdown.UploadType`: Choose upload method ("None", "CustomUploader", "PicGoServer")
- `cherryMarkdown.PicGoServer`: URL for PicGo server
- `cherryMarkdown.BackfillImageProps`: Image properties (border, shadow, radius)
