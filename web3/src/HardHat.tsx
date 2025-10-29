import { useEffect, useState } from "react";
import { ethers } from "ethers";

const CONTRACT_ADDRESS = "0x5fbdb2315678afecb367f032d93f642f64180aa3";

const DjuybuTexABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "function buy() payable",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
] as const;

type Transaction = {
  type: string;
  from: string;
  to: string;
  value: string;
  timestamp: string;
};

type Allowance = {
  spender: string;
  amount: string;
};

// Định nghĩa kiểu cho các tab
type TabName = "buy" | "transfer" | "allowances" | "history";

export default function HardHat() {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [address, setAddress] = useState<string>("");
  const [allowances, setAllowances] = useState<Allowance[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // State cho Allowance
  const [spender, setSpender] = useState<string>("");
  const [amount, setAmount] = useState<string>("");

  // State cho Buy
  const [ethAmount, setEthAmount] = useState<string>("0");

  // State cho Transfer
  const [transferTo, setTransferTo] = useState<string>("");
  const [transferAmount, setTransferAmount] = useState<string>("");

  // State cho TransferFrom
  const [transferFromFrom, setTransferFromFrom] = useState<string>("");
  const [transferFromTo, setTransferFromTo] = useState<string>("");
  const [transferFromAmount, setTransferFromAmount] = useState<string>("");

  // State cho Tab
  const [activeTab, setActiveTab] = useState<TabName>("buy");

  // Kết nối ví
  useEffect(() => {
    const init = async () => {
      if (!(window as any).ethereum) return alert("Please install MetaMask");
      const prov = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await prov.getSigner();
      const addr = await signer.getAddress();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, DjuybuTexABI, signer);
      setProvider(prov);
      setSigner(signer);
      setAddress(addr);
      setContract(contract);
      await loadTransactions(contract);
      await loadAllowances(contract, addr);
    };
    init();
  }, []);

  // Tải lịch sử giao dịch
  const loadTransactions = async (contract: ethers.Contract) => {
    const approvalEvents = await contract.queryFilter("Approval");
    const transferEvents = await contract.queryFilter("Transfer");
    const events = [...approvalEvents, ...transferEvents];

    const txs: Transaction[] = [];
    for (const ev of events) {
      if (!ev.args) continue; // Bỏ qua nếu không có args
      const block = await ev.getBlock();
      txs.push({
        type: ev.eventName,
        from: ev.args[0],
        to: ev.args[1],
        value: ev.args[2].toString(),
        timestamp: new Date(block.timestamp * 1000).toLocaleString(),
      });
    }
    setTransactions(txs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
  };

  // CRUD Allowance
  const handleApprove = async () => {
    if (!contract || !address) return;
    try {
      const tx = await contract.approve(spender, ethers.parseUnits(amount, 18));
      await tx.wait();
      alert("Cập nhật allowance thành công!");
      await loadAllowances(contract, address);
      await loadTransactions(contract);
    } catch (err) {
      console.error(err);
      alert("Cập nhật allowance thất bại!");
    }
  };

  const handleRevoke = async (spenderAddr: string) => {
    if (!contract || !address) return;
    try {
      const tx = await contract.approve(spenderAddr, 0);
      await tx.wait();
      alert("Thu hồi allowance thành công!");
      await loadAllowances(contract, address);
      await loadTransactions(contract);
    } catch (err) {
      console.error(err);
      alert("Thu hồi allowance thất bại!");
    }
  };

  const loadAllowances = async (contract: ethers.Contract, addr: string) => {
    if (!contract) return;
    try {
      const approvalFilter = contract.filters.Approval(addr, null, null);
      const approvalEvents = await contract.queryFilter(approvalFilter);

      const spenderSet = new Set<string>();
      for (const ev of approvalEvents) {
        if (ev.args && ev.args.spender) {
          spenderSet.add(ev.args.spender);
        }
      }

      const allowancePromises: Promise<Allowance | null>[] = [];
      for (const spenderAddr of spenderSet) {
        const promise = async (): Promise<Allowance | null> => {
          try {
            const currentAllowance = await contract.allowance(addr, spenderAddr);
            const formattedAmount = ethers.formatUnits(currentAllowance, 18);

            if (parseFloat(formattedAmount) > 0) {
              return { spender: spenderAddr, amount: formattedAmount };
            }
            return null;
          } catch (e) {
            console.error("Lỗi khi tải allowance cho:", spenderAddr, e);
            return null;
          }
        };
        allowancePromises.push(promise());
      }

      const results = await Promise.all(allowancePromises);
      const validAllowances = results.filter((a) => a !== null) as Allowance[];

      setAllowances(validAllowances);
    } catch (err) {
      console.error("Không thể tải allowances:", err);
    }
  };

  // Buy DJT từ ETH
  const handleBuyDJT = async () => {
    if (!contract || !signer) return;
    try {
      const tx = await contract.buy({ value: ethers.parseEther(ethAmount) });
      await tx.wait();
      alert("Mua DJT thành công!");
      await loadTransactions(contract);
    } catch (err) {
      console.error(err);
      alert("Mua DJT thất bại!");
    }
  };

  // Transfer DJT
  const handleTransfer = async () => {
    if (!contract) return;
    try {
      const tx = await contract.transfer(
        transferTo,
        ethers.parseUnits(transferAmount, 18)
      );
      await tx.wait();
      alert("Chuyển khoản thành công!");
      setTransferTo("");
      setTransferAmount("");
      await loadTransactions(contract);
    } catch (err) {
      console.error(err);
      alert("Chuyển khoản thất bại!");
    }
  };

  // TransferFrom DJT (Tiêu thụ allowance)
  const handleTransferFrom = async () => {
    if (!contract || !address) return;
    try {
      const tx = await contract.transferFrom(
        transferFromFrom,
        transferFromTo,
        ethers.parseUnits(transferFromAmount, 18)
      );
      await tx.wait();
      alert("TransferFrom thành công!");
      setTransferFromFrom("");
      setTransferFromTo("");
      setTransferFromAmount("");
      await loadTransactions(contract);
      await loadAllowances(contract, address);
    } catch (err) {
      console.error(err);
      alert("TransferFrom thất bại!");
    }
  };

  // --- Helper cho giao diện ---
  
  // Hàm helper để tạo class cho tab
  const getTabClass = (tabName: TabName) => {
    const baseClass = "px-4 py-2 font-semibold transition-colors duration-200 focus:outline-none";
    if (activeTab === tabName) {
      return `${baseClass} text-[#395a7f] border-b-2 border-[#395a7f]`;
    }
    return `${baseClass} text-[#6e9fc1] hover:text-[#395a7f]`;
  };

  // Class chung cho input
  const inputClass = "w-full p-2 rounded text-black border border-[#acacac] focus:ring-2 focus:ring-[#6e9fc1] focus:outline-none";
  
  // Class chung cho button
  const buttonClass = "w-full bg-[#6e9fc1] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#a3cae9] hover:text-[#395a7f] transition-colors duration-200";
  
  // Class chung cho card nội dung tab
  const tabContentClass = "bg-[#a3cae9]/20 p-6 rounded-lg shadow-inner";

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto bg-[#e9ecee] min-h-screen">
      <div className="bg-white p-6 rounded-lg shadow-lg">
        {/* --- Header --- */}
        <h1 className="text-3xl font-bold mb-2 text-[#395a7f]">DjuybuTex Wallet</h1>
        <p className="mb-6 text-[#acacac] text-sm truncate">
          Ví của bạn: {address}
        </p>

        {/* --- Tab Navigation --- */}
        <div className="flex border-b border-[#acacac] mb-6">
          <button onClick={() => setActiveTab("buy")} className={getTabClass("buy")}>
            Mua DJT
          </button>
          <button onClick={() => setActiveTab("transfer")} className={getTabClass("transfer")}>
            Chuyển khoản
          </button>
          <button onClick={() => setActiveTab("allowances")} className={getTabClass("allowances")}>
            Ủy quyền
          </button>
          <button onClick={() => setActiveTab("history")} className={getTabClass("history")}>
            Lịch sử
          </button>
        </div>

        {/* --- Tab Content --- */}
        <div className="text-[#395a7f]">
          {/* === Tab 1: Buy DJT === */}
          {activeTab === "buy" && (
            <div className={tabContentClass}>
              <h2 className="text-2xl font-semibold mb-4 text-[#395a7f]">Mua DJT</h2>
              <div className="flex flex-col sm:flex-row gap-2 mb-3">
                <input
                  type="number"
                  placeholder="Số lượng ETH"
                  value={ethAmount}
                  onChange={(e) => setEthAmount(e.target.value)}
                  className={`${inputClass} flex-1`}
                />
                <button
                  onClick={handleBuyDJT}
                  className={`${buttonClass} sm:w-auto`}
                >
                  Mua DJT
                </button>
              </div>
              <p className="text-sm text-[#6e9fc1]">Tỷ giá: 100 ETH → 1 DJT (Ví dụ)</p>
            </div>
          )}

          {/* === Tab 2: Transfer & TransferFrom === */}
          {activeTab === "transfer" && (
            <div className="space-y-6">
              {/* Transfer */}
              <div className={tabContentClass}>
                <h2 className="text-2xl font-semibold mb-4 text-[#395a7f]">Gửi DJT</h2>
                <div className="flex flex-col gap-3 mb-3">
                  <input
                    type="text"
                    placeholder="Địa chỉ người nhận"
                    value={transferTo}
                    onChange={(e) => setTransferTo(e.target.value)}
                    className={inputClass}
                  />
                  <input
                    type="number"
                    placeholder="Số lượng"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <button
                  onClick={handleTransfer}
                  className={buttonClass}
                >
                  Gửi
                </button>
              </div>

              {/* TransferFrom */}
              <div className={tabContentClass}>
                <h2 className="text-2xl font-semibold mb-4 text-[#395a7f]">Sử dụng Allowance (Gửi thay mặt)</h2>
                <div className="flex flex-col gap-3 mb-3">
                  <input
                    type="text"
                    placeholder="Từ địa chỉ (Owner)"
                    value={transferFromFrom}
                    onChange={(e) => setTransferFromFrom(e.target.value)}
                    className={inputClass}
                  />
                  <input
                    type="text"
                    placeholder="Đến địa chỉ (Recipient)"
                    value={transferFromTo}
                    onChange={(e) => setTransferFromTo(e.target.value)}
                    className={inputClass}
                  />
                  <input
                    type="number"
                    placeholder="Số lượng"
                    value={transferFromAmount}
                    onChange={(e) => setTransferFromAmount(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <button
                  onClick={handleTransferFrom}
                  className={buttonClass}
                >
                  Gửi thay mặt
                </button>
              </div>
            </div>
          )}

          {/* === Tab 3: Allowances === */}
          {activeTab === "allowances" && (
            <div className={tabContentClass}>
              <h2 className="text-2xl font-semibold mb-4 text-[#395a7f]">Quản lý Ủy quyền</h2>
              {/* Form tạo/cập nhật allowance */}
              <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Địa chỉ Spender"
                  value={spender}
                  onChange={(e) => setSpender(e.target.value)}
                  className={`${inputClass} flex-1`}
                />
                <input
                  type="number"
                  placeholder="Số lượng"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`${inputClass} sm:w-32`}
                />
                <button
                  onClick={handleApprove}
                  className={`${buttonClass} sm:w-auto`}
                >
                  Lưu
                </button>
              </div>

              {/* Bảng hiển thị allowance */}
              <h3 className="text-xl font-semibold mt-6 mb-2">Các Ủy quyền Hiện tại</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[#395a7f]">
                  <thead>
                    <tr className="border-b-2 border-[#6e9fc1]">
                      <th className="p-2">Spender</th>
                      <th className="p-2">Số lượng</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {allowances.length > 0 ? allowances.map((item) => (
                      <tr key={item.spender} className="border-b border-[#acacac] hover:bg-[#a3cae9]/10">
                        <td className="p-2 truncate max-w-[120px]" title={item.spender}>{item.spender}</td>
                        <td className="p-2">{item.amount}</td>
                        <td className="p-2 text-right">
                          <button
                            onClick={() => handleRevoke(item.spender)}
                            className="bg-[#acacac] text-white px-3 py-1 rounded hover:bg-[#9a9a9a] transition-colors"
                          >
                            Thu hồi
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={3} className="p-2 text-center text-[#acacac]">Không có ủy quyền nào.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* === Tab 4: History === */}
          {activeTab === "history" && (
            <div className={tabContentClass}>
              <h2 className="text-2xl font-semibold mb-4 text-[#395a7f]">Lịch sử giao dịch</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[#395a7f]">
                  <thead>
                    <tr className="border-b-2 border-[#6e9fc1]">
                      <th className="p-2">Loại</th>
                      <th className="p-2">From</th>
                      <th className="p-2">To</th>
                      <th className="p-2">Giá trị</th>
                      <th className="p-2">Thời gian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.length > 0 ? transactions.map((tx, i) => (
                      <tr key={i} className="border-b border-[#acacac] hover:bg-[#a3cae9]/10">
                        <td className="p-2">{tx.type}</td>
                        <td className="p-2 truncate max-w-[120px]" title={tx.from}>{tx.from}</td>
                        <td className="p-2 truncate max-w-[120px]" title={tx.to}>{tx.to}</td>
                        <td className="p-2">{ethers.formatUnits(tx.value, 18)}</td>
                        <td className="p-2">{tx.timestamp}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="p-2 text-center text-[#acacac]">Không có giao dịch nào.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}