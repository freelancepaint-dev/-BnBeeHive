// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title BnBeeHive - educational/testnet-only compounding pool prototype
/// @notice This contract does not create external yield. Harvests are paid from BNB held by the contract.
contract BnBeeHive {
    uint256 public constant HONEY_TO_HIRE_1_BEE = 1_080_000;
    uint256 public constant PSN = 10_000;
    uint256 public constant PSNH = 5_000;
    uint256 public constant DEV_FEE_BPS = 300;
    uint256 public constant REFERRAL_BPS = 1_000;
    uint256 public constant BPS = 10_000;

    address payable public immutable treasury;
    bool public initialized;
    uint256 public marketHoney;

    mapping(address => uint256) public bees;
    mapping(address => uint256) public claimedHoney;
    mapping(address => uint256) public lastAction;
    mapping(address => address) public referrer;

    event Initialized(uint256 marketHoney);
    event Hired(address indexed user, uint256 bnbIn, uint256 honeyBought);
    event Compounded(address indexed user, uint256 honeyUsed, uint256 beesAdded);
    event Harvested(address indexed user, uint256 honeySold, uint256 bnbOut);
    event ReferralSet(address indexed user, address indexed referrer);

    constructor(address payable _treasury) {
        require(_treasury != address(0), "zero treasury");
        treasury = _treasury;
    }

    receive() external payable {}

    /// @dev Seed only after funding the contract on a testnet.
    function seedMarket(uint256 seedHoney) external payable {
        require(msg.sender == treasury, "treasury only");
        require(!initialized, "already initialized");
        require(seedHoney > 0, "zero seed");
        marketHoney = seedHoney;
        initialized = true;
        emit Initialized(seedHoney);
    }

    function hireBees(address _referrer) external payable {
        require(initialized, "not initialized");
        require(msg.value > 0, "zero BNB");

        _setReferrer(msg.sender, _referrer);

        uint256 fee = (msg.value * DEV_FEE_BPS) / BPS;
        uint256 net = msg.value - fee;
        uint256 honeyBought = calculateHoneyBuy(net, address(this).balance - msg.value);

    


        claimedHoney[msg.sender] += honeyBought;
        emit Hired(msg.sender, msg.value, honeyBought);
        _compound(msg.sender);
(bool ok,) = treasury.call{value: fee}("");
require(ok, "fee transfer failed");
    }

    function compoundHoney(address _referrer) external {
        require(initialized, "not initialized");
        _setReferrer(msg.sender, _referrer);
        _compound(msg.sender);
    }

    function harvestHoney() external {
        require(initialized, "not initialized");
        uint256 hasHoney = myHoney(msg.sender);
        require(hasHoney > 0, "no honey");

        uint256 value = calculateHoneySell(hasHoney);
        uint256 fee = (value * DEV_FEE_BPS) / BPS;
        uint256 payout = value - fee;

        claimedHoney[msg.sender] = 0;
        lastAction[msg.sender] = block.timestamp;
        marketHoney += hasHoney;
        emit Harvested(msg.sender, hasHoney, payout);
        require(address(this).balance >= value, "insufficient pool");
        (bool feeOk,) = treasury.call{value: fee}("");
        require(feeOk, "fee transfer failed");
        (bool userOk,) = payable(msg.sender).call{value: payout}("");
        require(userOk, "payout failed");
       
    }

    function _compound(address user) internal {
        uint256 honeyUsed = myHoney(user);
        require(honeyUsed > 0, "no honey");

        uint256 newBees = honeyUsed / HONEY_TO_HIRE_1_BEE;
        require(newBees > 0, "not enough honey");

        bees[user] += newBees;
        claimedHoney[user] = 0;
        lastAction[user] = block.timestamp;

        address r = referrer[user];
        if (r != address(0)) {
            claimedHoney[r] += (honeyUsed * REFERRAL_BPS) / BPS;
        }

        // Market growth dampens runaway compounding and mirrors the general
        // market-balancing concept used by classic miner-style contracts.
        marketHoney += honeyUsed / 5;
        emit Compounded(user, honeyUsed, newBees);
    }

    function _setReferrer(address user, address candidate) internal {
        if (referrer[user] == address(0) && candidate != user && candidate != address(0)) {
            referrer[user] = candidate;
            emit ReferralSet(user, candidate);
        }
    }

    function myHoney(address user) public view returns (uint256) {
        return claimedHoney[user] + honeySinceLastAction(user);
    }

    function honeySinceLastAction(address user) public view returns (uint256) {
        if (lastAction[user] == 0) return 0;
        uint256 secondsPassed = block.timestamp - lastAction[user];
        uint256 capped = secondsPassed > HONEY_TO_HIRE_1_BEE ? HONEY_TO_HIRE_1_BEE : secondsPassed;
        return capped * bees[user];
    }

    function calculateTrade(uint256 rt, uint256 rs, uint256 bs) public pure returns (uint256) {
        require(rt > 0 && rs > 0, "invalid trade");
        return (PSN * bs) / (PSNH + ((PSN * rs + PSNH * rt) / rt));
    }

    function calculateHoneySell(uint256 honey) public view returns (uint256) {
        return calculateTrade(honey, marketHoney, address(this).balance);
    }

    function calculateHoneyBuy(uint256 bnb, uint256 contractBalance) public view returns (uint256) {
        return calculateTrade(bnb, contractBalance, marketHoney);
    }

    function estimateHire(uint256 bnb) external view returns (uint256) {
        if (bnb == 0 || address(this).balance == 0 || marketHoney == 0) return 0;
        uint256 net = bnb - ((bnb * DEV_FEE_BPS) / BPS);
        return calculateHoneyBuy(net, address(this).balance);
    }
}
