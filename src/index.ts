import * as vscode from 'vscode'
import * as path from 'path'
import { getWebviewContent } from './webview'
import { uploadFileHandler } from './handler/uploadFile'

let cherryPanel: vscode.WebviewPanel | undefined
let isCherryPanelInit = false
let targetDocument: vscode.TextEditor | undefined
let disableScrollTrigger = false
let disableEditTrigger = false

export function activate(context: vscode.ExtensionContext) {
  const extensionPath = context.extensionPath

  // Register command
  const disposable = vscode.commands.registerCommand('cherrymarkdown.preview', () => {
    triggerEditorContentChange(true)
  })

  context.subscriptions.push(disposable)

  // Register events
  vscode.workspace.onDidOpenTextDocument(() => {
    triggerEditorContentChange()
  })

  vscode.window.onDidChangeActiveTextEditor((e: vscode.TextEditor | undefined) => {
    const cherryUsage = vscode.workspace.getConfiguration('cherryMarkdown').get('Usage')

    if (e?.document && cherryUsage === 'active') {
      triggerEditorContentChange()
      if (e.document.languageId !== 'markdown' && targetDocument) {
        cherryPanel?.webview.postMessage({ cmd: 'disable-edit', data: {} })
      } else {
        cherryPanel?.webview.postMessage({ cmd: 'enable-edit', data: {} })
      }
    }
  })

  vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent) => {
    if (isCherryPanelInit && e?.document && !disableEditTrigger) {
      triggerEditorContentChange()
    }
  })

  vscode.window.onDidChangeTextEditorVisibleRanges((e: vscode.TextEditorVisibleRangesChangeEvent) => {
    if (!isCherryPanelInit || disableScrollTrigger) return
    cherryPanel?.webview.postMessage({
      cmd: 'editor-scroll',
      data: e.visibleRanges[0].start.line,
    })
  })

  // Helper functions
  function getMarkdownFileInfo() {
    let currentEditor = vscode.window.activeTextEditor
    let currentDoc = currentEditor?.document
    let currentText = ''
    let currentTitle = ''
    if (currentDoc?.languageId !== 'markdown' && targetDocument?.document.languageId === 'markdown') {
      currentEditor = targetDocument
      currentDoc = targetDocument.document
    }
    if (currentDoc?.languageId === 'markdown') {
      if (currentEditor) {
        targetDocument = currentEditor
      }
      currentText = currentDoc?.getText() || ''
      currentTitle = path.basename(currentDoc?.fileName) || ''
    }

    currentTitle = currentTitle
      ? `Preview ${currentTitle} By Cherry Markdown`
      : `UnSupported By Cherry Markdown`
    const theme = vscode.workspace.getConfiguration('cherryMarkdown').get('Theme')
    const mdInfo = { text: currentText, theme }
    return { mdInfo, currentTitle }
  }

  function initCherryPanel() {
    const { mdInfo, currentTitle } = getMarkdownFileInfo()
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? ''
    cherryPanel = vscode.window.createWebviewPanel('cherrymarkdown.preview', currentTitle, vscode.ViewColumn.Two, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [
  vscode.Uri.file(path.join(extensionPath, 'res')),
        vscode.Uri.file(path.join(extensionPath, 'dist')),
        vscode.Uri.file(workspaceFolder),
      ],
    })
    cherryPanel.webview.html = getWebviewContent(
      { ...mdInfo, vscodeLanguage: vscode.env.language },
      cherryPanel,
      extensionPath
    )
    cherryPanel.iconPath = vscode.Uri.file(path.join(extensionPath, 'res/icon.png'))
    isCherryPanelInit = true

    initCherryPanelEvent()
  }

  let scrollTimeOut: ReturnType<typeof setTimeout> | undefined
  let editTimeOut: ReturnType<typeof setTimeout> | undefined

  function initCherryPanelEvent() {
    cherryPanel?.webview.onDidReceiveMessage(async (e: any) => {
      const { type, data } = e
      switch (type) {
        case 'preview-scroll': {
          disableScrollTrigger = true
          const pos = new vscode.Position(data, 0)
          const range = new vscode.Range(pos, pos)
          targetDocument?.revealRange(range, vscode.TextEditorRevealType.AtTop)
          if (scrollTimeOut) clearTimeout(scrollTimeOut)
          scrollTimeOut = setTimeout(() => {
            disableScrollTrigger = false
          }, 500)
          break
        }
        case 'change-theme':
          vscode.workspace.getConfiguration('cherryMarkdown').update('Theme', data, true)
          break
        case 'cherry-change': {
          disableEditTrigger = true
          targetDocument?.edit((editBuilder: vscode.TextEditorEdit) => {
            const endNum = (targetDocument?.document.lineCount || 0) + 1
            const end = new vscode.Position(endNum, 0)
            editBuilder.replace(new vscode.Range(new vscode.Position(0, 0), end), data.markdown)
          })
          if (editTimeOut) clearTimeout(editTimeOut)
          editTimeOut = setTimeout(() => {
            disableEditTrigger = false
          }, 500)
          break
        }
        case 'tips':
          vscode.window.showInformationMessage(data, 'OK')
          break
        case 'upload-file':
          uploadFileHandler(data).then((res: any) => {
            if (res.url !== '') {
              cherryPanel?.webview.postMessage({
                cmd: 'upload-file-callback',
                data: res,
              })
            } else {
              vscode.window.showInformationMessage('上传不成功')
            }
          })
          break
        case 'open-url': {
          if (data === 'href-invalid') {
            vscode.window.showErrorMessage('link is not valid, please check it.')
            return
          }
          if (/^(http|https):\/\//.test(data)) {
            vscode.env.openExternal(vscode.Uri.parse(data))
            return
          }
          const decodedData = decodeURIComponent(data)
          if (path.isAbsolute(decodedData)) {
            vscode.commands.executeCommand('vscode.open', vscode.Uri.file(decodedData), {
              preview: true,
            })
            return
          }
          if (data.startsWith('#')) {
            return
          }
          const uri = vscode.Uri.file(path.join(targetDocument?.document.uri.fsPath || '', '..', data))
          vscode.commands.executeCommand('vscode.open', uri, { preview: true })
          break
        }
        case 'export-png': {
          if (data === 'export-fail') {
            vscode.window.showErrorMessage('导出错误，请重新尝试')
            return
          }

          const uri = await vscode.window.showSaveDialog({
            filters: {
              Images: ['png'],
            },
            saveLabel: '保存截图',
          })

          if (uri) {
            const base64Data = data.replace(/^data:image\/png;base64,/, '')
            const buffer = Buffer.from(base64Data, 'base64')
            await vscode.workspace.fs.writeFile(uri, buffer)
            vscode.window.showInformationMessage('Image saved successfully!')
          } else {
            vscode.window.showWarningMessage('Save cancelled.')
          }
          break
        }
      }
    })
    cherryPanel?.onDidDispose(() => {
      isCherryPanelInit = false
    })
  }

  function triggerEditorContentChange(focus = false) {
    if (isCherryPanelInit) {
      const { mdInfo, currentTitle } = getMarkdownFileInfo()
      if (cherryPanel) cherryPanel.title = currentTitle
      cherryPanel?.webview.postMessage({ cmd: 'editor-change', data: mdInfo })
    } else {
      if (vscode.window.activeTextEditor?.document?.languageId === 'markdown') {
        const cherryUsage = vscode.workspace.getConfiguration('cherryMarkdown').get('Usage')
        if (cherryUsage === 'active' || focus) {
          initCherryPanel()
        }
      }
    }
  }
}

export function deactivate() {}
