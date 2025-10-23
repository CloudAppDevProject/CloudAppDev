"use client";

import React, { useRef, useState } from "react";
import { Toast } from "primereact/toast";
import { FileUpload } from "primereact/fileupload";
import { ProgressBar } from "primereact/progressbar";
import { Button } from "primereact/button";
import { Tooltip } from "primereact/tooltip";
import { Tag } from "primereact/tag";

/**
 * Reusable image uploader component.
 * @param {number} maxFiles - How many images can be uploaded at once.
 * @param {(files: string[]) => void} onUploaded - Callback when upload completes.
 */
export default function ImageUploader({ maxFiles = 1, onUploaded }) {
  const toast = useRef(null);
  const fileUploadRef = useRef(null);
  const [totalSize, setTotalSize] = useState(0);

  const onTemplateSelect = (e) => {
    let _totalSize = totalSize;
    let files = e.files;

    Object.keys(files).forEach((key) => {
      _totalSize += files[key].size || 0;
    });

    setTotalSize(_totalSize);
  };

  const onTemplateUpload = async (e) => {
    let _totalSize = 0;
    e.files.forEach((file) => {
      _totalSize += file.size || 0;
    });
    setTotalSize(_totalSize);

    toast.current.show({
      severity: "success",
      summary: "Upload complete",
      detail: `${e.files.length} file(s) uploaded`,
    });

    // Call optional callback with uploaded filenames
    if (onUploaded && e.xhr?.response) {
      try {
        const data = JSON.parse(e.xhr.response);
        onUploaded(data.files || []);
      } catch {
        onUploaded([]);
      }
    }
  };

  const onTemplateRemove = (file, callback) => {
    setTotalSize(totalSize - file.size);
    callback();
  };

  const onTemplateClear = () => {
    setTotalSize(0);
  };

  const headerTemplate = (options) => {
    const { className, chooseButton, uploadButton, cancelButton } = options;
    const MAX_SIZE = 100 * 1024 * 1024;
    const value = (totalSize / MAX_SIZE) * 100;
    const formatedValue = fileUploadRef && fileUploadRef.current ? fileUploadRef.current.formatSize(totalSize) : "0 B";

    return (
      <div
        className={className}
        style={{
          backgroundColor: "transparent",
          display: "flex",
          alignItems: "center",
        }}
      >
        {chooseButton}
        {uploadButton}
        {cancelButton}
        <div className="flex align-items-center gap-3 ml-auto">
          <span>{formatedValue} / 100 MB</span>
          <ProgressBar value={value} showValue={false} style={{ width: "10rem", height: "12px" }}></ProgressBar>
        </div>
      </div>
    );
  };

  const itemTemplate = (file, props) => {
    return (
      <div className="flex items-center justify-between w-full">
        <img alt={file.name} role="presentation" src={file.objectURL} width={80} />
        {file.name}
        <span className="flex flex-column text-left ml-3"></span>
        <small>{new Date().toLocaleDateString()}</small>
        <div className="flex align-items-center" style={{ width: "20%" }}></div>
        <Tag value={props.formatSize} severity="info" className="px-3 py-2" />
        <Button type="button" icon="pi pi-times" className="p-button-outlined p-button-rounded p-button-danger ml-auto" onClick={() => onTemplateRemove(file, props.onRemove)} />
      </div>
    );
  };

  const emptyTemplate = () => {
    return (
      <div className="flex flex-col items-center justify-center">
        <i
          className="pi pi-image mt-1 p-4"
          style={{
            fontSize: "2em",
            borderRadius: "50%",
            backgroundColor: "var(--surface-b)",
            color: "var(--surface-d)",
          }}
        ></i>
        <span style={{ fontSize: "1.2em", color: "var(--text-color-secondary)" }} className="my-2">
          Bild hier ablegen
        </span>
      </div>
    );
  };

  const chooseOptions = {
    icon: "pi pi-fw pi-images",
    iconOnly: true,
    className: "custom-choose-btn p-button-rounded p-button-outlined",
  };
  const uploadOptions = {
    icon: "pi pi-fw pi-cloud-upload",
    iconOnly: true,
    className: "custom-upload-btn p-button-success p-button-rounded p-button-outlined",
  };
  const cancelOptions = {
    icon: "pi pi-fw pi-times",
    iconOnly: true,
    className: "custom-cancel-btn p-button-danger p-button-rounded p-button-outlined",
  };

  return (
    <div>
      <Toast ref={toast}></Toast>

      <Tooltip target=".custom-choose-btn" content="Choose" position="bottom" />
      <Tooltip target=".custom-upload-btn" content="Upload" position="bottom" />
      <Tooltip target=".custom-cancel-btn" content="Clear" position="bottom" />

      <FileUpload
        ref={fileUploadRef}
        name="images"
        url="/api/upload"
        multiple={maxFiles > 1}
        accept="image/*"
        maxFileSize={104857600}
        onUpload={onTemplateUpload}
        onSelect={onTemplateSelect}
        onError={onTemplateClear}
        onClear={onTemplateClear}
        headerTemplate={headerTemplate}
        itemTemplate={itemTemplate}
        emptyTemplate={emptyTemplate}
        chooseOptions={chooseOptions}
        uploadOptions={uploadOptions}
        cancelOptions={cancelOptions}
      />
    </div>
  );
}
