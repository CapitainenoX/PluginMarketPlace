use axum::{
    body::Bytes,
    extract::Multipart,
    http::{header, StatusCode},
    response::{IntoResponse, Response},
};
use image::{imageops::FilterType, ImageFormat};
use std::io::Cursor;

/// Icon/screenshot thumbnails are capped to a fixed box; plugin icons and
/// screenshots don't need arbitrary caller-supplied dimensions.
const THUMB_MAX_WIDTH: u32 = 512;
const THUMB_MAX_HEIGHT: u32 = 512;
const MAX_UPLOAD_BYTES: usize = 20 << 20; // 20MB, generous for an icon/screenshot

pub async fn handle_thumbnail(mut multipart: Multipart) -> Response {
    let mut file_bytes: Option<Bytes> = None;

    loop {
        let field = match multipart.next_field().await {
            Ok(Some(f)) => f,
            Ok(None) => break,
            Err(e) => return (StatusCode::BAD_REQUEST, format!("invalid multipart body: {e}")).into_response(),
        };
        if field.name() == Some("file") {
            match field.bytes().await {
                Ok(b) => {
                    if b.len() > MAX_UPLOAD_BYTES {
                        return (StatusCode::BAD_REQUEST, "file too large").into_response();
                    }
                    file_bytes = Some(b);
                }
                Err(e) => return (StatusCode::BAD_REQUEST, format!("failed to read file field: {e}")).into_response(),
            }
        }
    }

    let Some(bytes) = file_bytes else {
        return (StatusCode::BAD_REQUEST, "missing 'file' field").into_response();
    };

    let img = match image::load_from_memory(&bytes) {
        Ok(img) => img,
        Err(e) => return (StatusCode::BAD_REQUEST, format!("not a decodable image: {e}")).into_response(),
    };

    let thumb = img.resize(THUMB_MAX_WIDTH, THUMB_MAX_HEIGHT, FilterType::Lanczos3);

    let mut out = Cursor::new(Vec::new());
    if let Err(e) = thumb.write_to(&mut out, ImageFormat::Png) {
        return (StatusCode::INTERNAL_SERVER_ERROR, format!("failed to encode thumbnail: {e}")).into_response();
    }

    ([(header::CONTENT_TYPE, "image/png")], out.into_inner()).into_response()
}
