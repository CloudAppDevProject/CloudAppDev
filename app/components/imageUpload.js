"use client";
import React, { useRef, useState } from "react";
import { Toast } from "primereact/toast";
import { FileUpload } from "primereact/fileupload";
import { ProgressBar } from "primereact/progressbar";
import { Button } from "primereact/button";
import { Tooltip } from "primereact/tooltip";
import { Tag } from "primereact/tag";
import { useFileUpload } from "@hooks/useFileUpload";
import { useUser } from "@context/UserContext";

/**
 * ImageUploader using PrimeReact UI but custom upload logic via useFileUpload()
 */
export default function ImageUploader({ maxFiles = 1, onUploaded }) {
  const toast = useRef(null);
  const fileUploadRef = useRef(null);
  const { user } = useUser();

  const [files, setFiles] = useState([]);
  const { uploadFile, uploadProgress, isUploading, uploadResult, resetUpload } = useFileUpload();

  // Called when user selects files
  const onTemplateSelect = (e) => {
    setFiles(e.files.slice(0, maxFiles));
  };

  // Called when user clicks Upload
  const onTemplateUpload = async () => {
    if (!user?.id || files.length === 0) return;

    const uploadedFiles = [];
    for (const file of files) {
      const result = await uploadFile(file, user.id, file.name);
      if (result.success && result.gcsUri) {
        uploadedFiles.push(result.gcsUri);
      } else {
        toast.current.show({
          severity: "error",
          summary: "Upload failed",
          detail: result.error || "Unknown error",
        });
      }
    }

    if (uploadedFiles.length > 0) {
      toast.current.show({
        severity: "success",
        summary: "Upload complete",
        detail: `${uploadedFiles.length} file(s) uploaded successfully`,
      });
      onUploaded?.(uploadedFiles);
      setFiles([]);
      resetUpload();
      fileUploadRef.current?.clear();
    }
  };

  const onTemplateRemove = (file, callback) => {
    setFiles((prev) => prev.filter((f) => f.name !== file.name));
    callback();
  };

  const onTemplateClear = () => {
    setFiles([]);
    resetUpload();
  };

  const headerTemplate = (options) => {
    const { className, chooseButton, uploadButton, cancelButton } = options;
    const MAX_SIZE = 20 * 1024 * 1024;
    const totalSize = files.reduce((acc, f) => acc + (f.size || 0), 0);
    const value = (totalSize / MAX_SIZE) * 100;
    const formattedValue = fileUploadRef.current ? fileUploadRef.current.formatSize(totalSize) : "0 B";

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
        <Button
          icon="pi pi-cloud-upload"
          label="Upload"
          onClick={onTemplateUpload}
          disabled={isUploading || files.length === 0}
          className="p-button-success p-button-rounded p-button-outlined ml-2"
        />
        {cancelButton}
        <div className="flex align-items-center gap-3 ml-auto">
          <span>{formattedValue} / 20 MB</span>
          <ProgressBar value={isUploading ? uploadProgress : value} showValue={false} style={{ width: "10rem", height: "12px" }} />
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
  const cancelOptions = {
    icon: "pi pi-fw pi-times",
    iconOnly: true,
    className: "custom-cancel-btn p-button-danger p-button-rounded p-button-outlined",
  };

  return (
    <div>
      <Toast ref={toast} />
      <Tooltip target=".custom-choose-btn" content="Choose" position="bottom" />
      <Tooltip target=".custom-cancel-btn" content="Clear" position="bottom" />

      <FileUpload
        ref={fileUploadRef}
        name="images"
        multiple={maxFiles > 1}
        accept="image/*"
        maxFileSize={20971520}
        onSelect={onTemplateSelect}
        onClear={onTemplateClear}
        customUpload
        headerTemplate={headerTemplate}
        itemTemplate={itemTemplate}
        emptyTemplate={emptyTemplate}
        chooseOptions={chooseOptions}
        cancelOptions={cancelOptions}
      />
    </div>
  );
}
