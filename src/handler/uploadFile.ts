import * as vscode from 'vscode';
import {
  UploadType,
  BackfillImageProps,
  BackfillImage,
} from '../types';
import axios, { AxiosResponse } from 'axios';

export interface FileInfo {
  name: string;
  type: string;
  path: string;
  size: number;
}

export interface UploadFileHandlerRes extends BackfillImage {
  name: string;
  url: string;
  poster?: string;
}

export const uploadFileHandler = async (fileInfo: FileInfo) => {
  const { name = '', type = '', path = '' } = fileInfo;

  const UploadType = vscode.workspace.getConfiguration('cherryMarkdown').get<UploadType>('UploadType');

  const res: UploadFileHandlerRes = { name, url: '' };

  const BackfillImageProps = vscode.workspace
    .getConfiguration('cherryMarkdown')
    .get<BackfillImageProps>('BackfillImageProps', []);

  BackfillImageProps.reduce((prev, curr) => ((prev[curr] = true), prev), res);

  switch (UploadType) {
    case 'CustomUploader':
      vscode.window.showInformationMessage('自定义上传暂未开发');
      throw new Error('自定义上传暂未开发');
    case 'PicGoServer':
      const PicGoServer = vscode.workspace
        .getConfiguration('cherryMarkdown')
        .get<string>('PicGoServer', 'http://127.0.0.1:36677/upload');
      const upload = await axios.post<any, AxiosResponse<{ success: boolean; result: string[] }>, { list: string[] }>(
        PicGoServer,
        { list: [path] },
        { headers: { 'Content-Type': 'application/json' } },
      );
      if (upload.data?.success !== true) {
        throw new Error('上传失败');
      } else {
        res.url = upload.data?.result?.[0] ?? '';
      }
      break;
    default:
      if (type.startsWith('image')) {
        const file = await vscode.workspace.fs.readFile(vscode.Uri.file(path));
        const base64 = Buffer.from(file).toString('base64');
        res.url = `data:${type};base64,${base64}`;
      } else {
        vscode.window.showInformationMessage('未指定上传服务时暂时只支持图片');
        throw new Error('未指定上传服务时暂时只支持图片');
      }
      break;
  }
  return res;
};