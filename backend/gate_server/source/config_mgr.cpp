#include "config_mgr.hpp"

#include <fstream>
#include <iostream>
#include <sstream>
#include <string>

SubSection::SubSection( const SubSection& rhs )
{
    name = rhs.name;
    datas = rhs.datas;
}

SubSection& SubSection::operator=( const SubSection& rhs )
{
    name = rhs.name;
    datas = rhs.datas;

    return *this;
}

SubSection::SubSection( SubSection&& rhs )
{
    name = std::move( rhs.name );
    datas = std::move( rhs.datas );
}

#ifdef DEBUG
const std::string ConfigMgr::CONFIG_FILE = "../resources/config.json";
#else
const std::string ConfigMgr::CONFIG_FILE = "./resources/config.json";
#endif

ConfigMgr::~ConfigMgr()
{
    sections.clear();

    std::cout << "config manager destructed" << std::endl;
}

SubSection ConfigMgr::operator[]( const std::string& section_name )
{
    // 遍历配置块，找到对应的配置块
    // 当没有找到对应的配置块时，返回一个空的配置块
    auto iter = sections.begin();
    for ( ; iter != sections.end(); ++iter )
    {
        if ( iter->first == section_name )
            return sections[ section_name ];
    }
    return SubSection();
}

ConfigMgr::ConfigMgr()
{
    // 读取配置文件
    std::ifstream ifs_cfg( CONFIG_FILE );
    if ( !ifs_cfg.is_open() )
    {
        std::cout << "open config file failed" << std::endl;
        return;
    }
    std::string str_cfg = std::string(
        std::istreambuf_iterator<char>( ifs_cfg ), std::istreambuf_iterator<char>() );

    // 解析配置文件
    nlohmann::json json_cfg = nlohmann::json::parse( str_cfg );

    // 遍历配置文件，写入配置块
    for ( auto& [section_name, section_data] : json_cfg.items() )
    {
        SubSection section;
        for ( auto& [key, value] : section_data.items() )
        {
            section.AddData(
                key, value.get<std::string>() );
        }

        sections.emplace( section_name, std::move( section ) );
    }

    std::cout
        << "config loaded from " << CONFIG_FILE
        << " with: " << json_cfg.dump( 4 ) << std::endl;

    std::cout << "config manager constructed" << std::endl;
}
