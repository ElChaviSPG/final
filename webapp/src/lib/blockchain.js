import { ethers } from 'ethers';
import crypto from 'crypto';

const ABI = [
  'event AuditRegistrado(string indexed sessionId, string dataHash, string action, uint256 timestamp)',
  'function registrar(string calldata sessionId, string calldata dataHash, string calldata action) external',
];

let _contract = null;

function getContract() {
  if (_contract) return _contract;

  const rpc     = process.env.BLOCKCHAIN_RPC_URL;
  const privKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
  const address = process.env.BLOCKCHAIN_CONTRACT_ADDRESS;

  if (!rpc || !privKey || !address) return null;

  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet   = new ethers.Wallet(privKey, provider);
  _contract = new ethers.Contract(address, ABI, wallet);
  return _contract;
}

/**
 * Ancla un registro de auditoría a blockchain.
 * No lanza excepción — si falla, solo loguea. La BD es la fuente de verdad.
 */
export async function anclarAudit({ sessionId, action, data }) {
  const contract = getContract();
  if (!contract) return null;

  try {
    const dataHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');

    // Submit TX and return immediately — don't wait for block confirmation.
    // Mining happens asynchronously on Polygon Amoy; waiting here would add ~2s
    // to every scan response while Vercel has the function alive.
    const tx = await contract.registrar(String(sessionId), dataHash, String(action));
    return { txHash: tx.hash, dataHash };
  } catch (err) {
    console.error('[blockchain] Error al anclar audit:', err.message);
    return null;
  }
}
