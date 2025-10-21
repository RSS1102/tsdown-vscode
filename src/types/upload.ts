// 上传方式
export type UploadType = 'None' | 'CustomUploader' | 'PicGoServer';

// 回填图片附加参数
export type BackfillImageProps = Array<'isBorder' | 'isShadow' | 'isRadius'>;

// 返回类型
export type BackfillImage = {
  [_key in BackfillImageProps[number]]?: boolean;
};