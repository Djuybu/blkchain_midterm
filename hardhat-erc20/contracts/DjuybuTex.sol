// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract DjuybuTex is ERC20 {
    uint256 public constant RATE = 100; // 100 ETH -> 1 DJT

    constructor(uint256 initialSupply) ERC20("DjuybuTex", "DJT") {
        _mint(msg.sender, initialSupply * 10 ** decimals());
    }

    // Hàm mua DJT từ ETH
    function buy() external payable {
        require(msg.value > 0, "Send ETH to buy DJT");

        // Số token DJT = ETH gửi / 100
        uint256 tokenAmount = (msg.value * 1 ether) / RATE;
        _mint(msg.sender, tokenAmount);
    }

    // Cho phép rút ETH từ contract nếu cần
    function withdraw() external {
        payable(owner()).transfer(address(this).balance);
    }

    // Lấy owner (người deploy)
    function owner() public view returns (address) {
        return _owner;
    }

    address private _owner = msg.sender;
}
