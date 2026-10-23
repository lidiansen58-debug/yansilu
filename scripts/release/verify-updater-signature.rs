use minisign_verify::{PublicKey, Signature};
use std::{env, fs, path::Path};
fn main() {
    let args: Vec<String> = env::args().collect();
    assert_eq!(args.len(), 4);
    let mut bytes = fs::read(&args[1]).expect("artifact");
    let signature = Signature::from_file(Path::new(&args[2])).expect("signature");
    let key = PublicKey::from_file(Path::new(&args[3])).expect("public key");
    key.verify(&bytes, &signature, false).expect("signature verification failed");
    bytes[0] ^= 1;
    assert!(key.verify(&bytes, &signature, false).is_err());
    println!("Signature verified; modified bytes rejected.");
}
