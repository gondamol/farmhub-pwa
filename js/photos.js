/**
 * FarmHub - Photo Upload Module
 * Handles goat photo capture and storage
 */

const PhotoUpload = {
    // Maximum image dimensions
    MAX_WIDTH: 800,
    MAX_HEIGHT: 800,
    QUALITY: 0.8,

    /**
     * Open camera or file picker for photo
     */
    async selectPhoto() {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.capture = 'environment'; // Prefer rear camera on mobile

            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) {
                    reject(new Error('No file selected'));
                    return;
                }

                try {
                    const dataUrl = await this.processImage(file);
                    resolve(dataUrl);
                } catch (err) {
                    reject(err);
                }
            };

            input.click();
        });
    },

    /**
     * Process and resize image
     */
    async processImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const img = new Image();

                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let { width, height } = img;

                    // Calculate new dimensions
                    if (width > height) {
                        if (width > this.MAX_WIDTH) {
                            height *= this.MAX_WIDTH / width;
                            width = this.MAX_WIDTH;
                        }
                    } else {
                        if (height > this.MAX_HEIGHT) {
                            width *= this.MAX_HEIGHT / height;
                            height = this.MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Convert to JPEG data URL
                    const dataUrl = canvas.toDataURL('image/jpeg', this.QUALITY);
                    resolve(dataUrl);
                };

                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = e.target.result;
            };

            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    },

    /**
     * Create photo upload button component
     */
    createUploadButton(currentPhotoUrl = null, onUpload) {
        const container = document.createElement('div');
        container.className = 'photo-upload-container';
        container.innerHTML = `
            <div class="photo-preview" style="
                width: 120px;
                height: 120px;
                border-radius: 12px;
                background: var(--gray-100);
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
                cursor: pointer;
                border: 2px dashed var(--gray-300);
                margin: 0 auto 12px;
            ">
                ${currentPhotoUrl
                ? `<img src="${currentPhotoUrl}" style="width: 100%; height: 100%; object-fit: cover;">`
                : `<i class="fas fa-camera" style="font-size: 32px; color: var(--gray-400);"></i>`
            }
            </div>
            <button type="button" class="btn btn-secondary btn-block" style="font-size: 14px;">
                <i class="fas fa-camera"></i> ${currentPhotoUrl ? 'Change Photo' : 'Add Photo'}
            </button>
        `;

        const uploadBtn = container.querySelector('button');
        const preview = container.querySelector('.photo-preview');

        const handleUpload = async () => {
            try {
                const dataUrl = await this.selectPhoto();
                preview.innerHTML = `<img src="${dataUrl}" style="width: 100%; height: 100%; object-fit: cover;">`;
                uploadBtn.innerHTML = '<i class="fas fa-camera"></i> Change Photo';
                container.style.borderColor = 'var(--primary-500)';

                if (onUpload) {
                    onUpload(dataUrl);
                }
            } catch (err) {
                console.error('Photo upload failed:', err);
            }
        };

        uploadBtn.addEventListener('click', handleUpload);
        preview.addEventListener('click', handleUpload);

        return container;
    }
};

// Export
window.PhotoUpload = PhotoUpload;
