pragma solidity ^0.5.0;

import "../appGovernanceUpgrade/Upgrader.sol";
import "../appGovernanceUpgrade/Governance.sol";
import "../appGovernanceUpgrade/Resolver.sol";
import "../appGovernanceUpgrade/UpgraderInfo.sol";
import "./PreUpgrader1.sol";

contract PreUpgrader2 is Upgrader {

    //Variables from previous Migration
    address private _governanceAddr;

    //New variables
    address private _resolverAddr;

    constructor(address preUpgraderAddr1) public {
        PreUpgrader1 preUpgrader1 = PreUpgrader1(preUpgraderAddr1);
        _governanceAddr = preUpgrader1.governanceAddr();

    }

    modifier onlyGovernance() {
        require(_governanceAddr==msg.sender, "This function can only be executed by the Governance");
        _;
    }

    function upgrade () external onlyGovernance {


        Governance governance = Governance(_governanceAddr);
        UpgraderInfo ui = UpgraderInfo(governance.upgraderInfoAddr());

        Resolver resolver = new Resolver(governance.upgraderInfoAddr());
        resolver.addPauser(governance.owner());
        if (governance.owner()!=ui.adminAddr()) {
            resolver.addPauser(ui.adminAddr());
        }
        resolver.renouncePauser();
        _resolverAddr = address(resolver);
        
    }

    function governanceAddr() public view returns (address) {
        return _governanceAddr;
    }

    function resolverAddr() public view returns (address) {
        return _resolverAddr;
    }

}