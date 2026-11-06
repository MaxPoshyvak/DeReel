// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    #[cfg(target_os = "macos")]
    unsafe {
        extern "C" {
            fn setprogname(name: *const std::os::raw::c_char);
        }
        setprogname(c"DeReel".as_ptr());
    }

    dereel_lib::run();
}
